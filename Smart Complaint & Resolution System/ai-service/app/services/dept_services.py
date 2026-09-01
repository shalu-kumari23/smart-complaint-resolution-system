from datetime import datetime, timezone
from bson import ObjectId

from fastapi import HTTPException, status
from pymongo.errors import DuplicateKeyError

from ..models.users import user_model
from ..security import create_access_token, hash_password, is_password_hashed, verify_password
from .user_services import authenticate_access_token, get_user_by_identifier, normalize_identifier


def serialize_officer(user):
    return {
        "id": str(user["_id"]),
        "full_name": user["full_name"],
        "username": user["username"],
        "email": user["email"],
        "department": user["department"],
        "role": user["role"],
        "created_at": user["created_at"],
    }


def _serialize_department_complaint(complaint):
    user_snapshot = complaint.get("user_snapshot", {})
    ml_output = complaint.get("ml_output", {})
    return {
        "id": str(complaint["_id"]),
        "user_id": complaint.get("user_id", ""),
        "text": complaint["text"],
        "department": complaint["user_selected_department"],
        "status": complaint["status"],
        "action_taken": complaint.get("action_taken"),
        "created_at": complaint["created_at"],
        "resolved_at": complaint.get("resolved_at"),
        "urgency_score": ml_output.get("urgency_score"),
        "delay_risk": ml_output.get("delay_risk"),
        "priority": ml_output.get("priority", "low"),
        "sentiment": ml_output.get("sentiment", "neutral"),
        "sentiment_score": ml_output.get("sentiment_score", 0.0),
        "history": complaint.get("history", []),
        "user": {
            "full_name": user_snapshot.get("full_name", "Unknown"),
            "age": user_snapshot.get("age", 0),
            "address": user_snapshot.get(
                "address",
                {"pin_code": "", "county": "", "state": "", "city": ""},
            ),
        },
    }


def create_department_officer(db, data):
    payload = data.model_dump()
    payload["email"] = normalize_identifier(payload["email"])
    payload["username"] = normalize_identifier(payload["username"])
    payload["role"] = "department"
    payload["password"] = hash_password(payload["password"])

    existing = db["users"].find_one(
        {"$or": [{"email": payload["email"]}, {"username": payload["username"]}]}
    )
    if existing is not None:
        if existing.get("role") == "department" and existing.get("department") != payload["department"]:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="You are already an employee at another department.",
            )
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email or username already exists.",
        )

    officer = user_model(payload)
    try:
        result = db["users"].insert_one(officer)
    except DuplicateKeyError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email or username already exists.",
        ) from exc
    saved_officer = db["users"].find_one({"_id": result.inserted_id})

    return serialize_officer(saved_officer)


def login_department_officer(db, data):
    officer = get_user_by_identifier(db, data.identifier, role="department")
    if officer is None or not verify_password(data.password, officer["password"]) or not officer.get("is_active", True):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid department credentials.",
        )

    if not is_password_hashed(officer["password"]):
        upgraded_password = hash_password(data.password)
        db["users"].update_one(
            {"_id": officer["_id"]},
            {"$set": {"password": upgraded_password}},
        )
        officer["password"] = upgraded_password

    access_token = create_access_token(str(officer["_id"]), officer["role"])

    return {
        "message": "Department login successful",
        "access_token": access_token,
        "token_type": "bearer",
        "officer": serialize_officer(officer),
    }


def get_department_complaints(db, access_token, status: str | None = None, priority: str | None = None):
    officer = authenticate_access_token(db, access_token, role="department")
    query = {"user_selected_department": officer["department"]}
    if status:
        query["status"] = status
    if priority:
        # Check priority in nested ml_output
        query["ml_output.priority"] = priority

    complaints = db["complaints"].find(query).sort("created_at", -1)
    return [_serialize_department_complaint(complaint) for complaint in complaints]


def update_complaint_by_department(db, complaint_id, data, access_token: str):
    officer = authenticate_access_token(db, access_token, role="department")

    if not ObjectId.is_valid(complaint_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid complaint id.",
        )

    complaint = db["complaints"].find_one({"_id": ObjectId(complaint_id)})
    if complaint is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Complaint not found.",
        )

    if complaint["user_selected_department"] != officer["department"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can review only complaints assigned to your department.",
        )

    now = datetime.now(timezone.utc)
    update_data = {
        "status": data.status,
        "action_taken": data.action_taken,
        "resolved_at": data.resolved_at or now,
        "updated_at": now
    }

    # Append to history timeline
    new_history = list(complaint.get("history", []))
    new_history.append({
        "status": data.status,
        "message": f"Status updated to '{data.status.upper()}' by Officer {officer['full_name']}. Remark: '{data.action_taken or 'No remarks provided'}'",
        "timestamp": now
    })
    update_data["history"] = new_history

    db["complaints"].update_one(
        {"_id": complaint["_id"]},
        {"$set": update_data},
    )
    updated_complaint = db["complaints"].find_one({"_id": complaint["_id"]})

    # Save notification for citizen
    db["notifications"].insert_one({
        "user_id": complaint["user_id"],
        "message": f"Your complaint regarding '{complaint['user_selected_department']}' has been updated to '{data.status.upper()}'. Note: {data.action_taken or 'None'}.",
        "read": False,
        "created_at": now
    })

    # Try sending email notification to citizen
    citizen = db["users"].find_one({"_id": ObjectId(complaint["user_id"])})
    if citizen and citizen.get("email"):
        from ..llm.email_generator import generate_email_notification
        from ..config import settings
        smtp_settings = {
            "SMTP_HOST": settings.SMTP_HOST,
            "SMTP_PORT": settings.SMTP_PORT,
            "SMTP_USER": settings.SMTP_USER,
            "SMTP_PASSWORD": settings.SMTP_PASSWORD
        }
        try:
            generate_email_notification(
                to_email=citizen["email"],
                citizen_name=citizen["full_name"],
                complaint_id=str(complaint["_id"]),
                status=data.status,
                text=complaint.get("text", ""),
                action_taken=data.action_taken,
                smtp_settings=smtp_settings
            )
        except Exception as e:
            print("⚠️ Warning: Failed to send email update notification:", str(e))

    return _serialize_department_complaint(updated_complaint)
