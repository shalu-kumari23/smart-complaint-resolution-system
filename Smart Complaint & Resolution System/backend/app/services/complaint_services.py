from bson import ObjectId
from fastapi import HTTPException, status

from ..models.complaints import complaint_model
from .user_services import authenticate_access_token


def serialize_complaint(complaint):
    user_snapshot = complaint.get("user_snapshot", {})
    return {
        "id": str(complaint["_id"]),
        "user_id": complaint.get("user_id", ""),
        "text": complaint["text"],
        "department": complaint["user_selected_department"],
        "status": complaint["status"],
        "action_taken": complaint.get("action_taken"),
        "created_at": complaint["created_at"],
        "resolved_at": complaint.get("resolved_at"),
        "user": {
            "full_name": user_snapshot.get("full_name", "Unknown"),
            "age": user_snapshot.get("age", 0),
            "address": user_snapshot.get(
                "address",
                {"pin_code": "", "county": "", "state": "", "city": ""},
            ),
        },
    }


def _get_complaint_or_404(db, complaint_id: str):
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
    return complaint


def create_complaint(db, data, access_token: str):
    user = authenticate_access_token(db, access_token, role="user")
    complaint = complaint_model(
        data.model_dump(),
        user,
    )

    result = db["complaints"].insert_one(complaint)
    saved_complaint = db["complaints"].find_one({"_id": result.inserted_id})

    return serialize_complaint(saved_complaint)


def get_user_complaints(db, access_token: str):
    user = authenticate_access_token(db, access_token, role="user")
    complaints = db["complaints"].find({"user_id": str(user["_id"])})

    return [serialize_complaint(complaint) for complaint in complaints]


def update_user_complaint(db, complaint_id: str, data, access_token: str):
    user = authenticate_access_token(db, access_token, role="user")
    complaint = _get_complaint_or_404(db, complaint_id)

    if complaint.get("user_id") != str(user["_id"]):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can update only your own complaints.",
        )

    if complaint["status"] in {"resolved", "rejected"}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Resolved or rejected complaints cannot be updated by the user.",
        )

    update_data = {}
    if data.text is not None:
        update_data["text"] = data.text
    if data.user_selected_department is not None:
        update_data["user_selected_department"] = data.user_selected_department

    if not update_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Provide at least one complaint field to update.",
        )

    db["complaints"].update_one(
        {"_id": complaint["_id"]},
        {"$set": update_data},
    )
    updated_complaint = db["complaints"].find_one({"_id": complaint["_id"]})

    return serialize_complaint(updated_complaint)


def track_complaint(db, complaint_id: str, access_token: str):
    # Track can be called by user, department, or admin
    from ..security import decode_access_token
    payload = decode_access_token(access_token)
    role = payload.get("role")
    
    complaint = _get_complaint_or_404(db, complaint_id)
    
    # User can only track their own
    if role == "user" and complaint.get("user_id") != payload.get("sub"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can track only your own complaints.",
        )
    
    # Department can only track theirs
    if role == "department":
        from .dept_services import authenticate_access_token as auth_dept
        officer = auth_dept(db, access_token, role="department")
        if complaint["user_selected_department"] != officer["department"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can track only complaints assigned to your department.",
            )

    return {
        "complaint_id": str(complaint["_id"]),
        "status": complaint["status"],
        "history": complaint.get("history", []),
        "created_at": complaint["created_at"],
        "resolved_at": complaint.get("resolved_at"),
        "action_taken": complaint.get("action_taken"),
        "ai_analysis": complaint.get("ml_output", {})
    }
