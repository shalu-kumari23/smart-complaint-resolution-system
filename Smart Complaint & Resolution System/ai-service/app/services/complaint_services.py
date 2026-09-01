from datetime import datetime, timezone
from bson import ObjectId
from fastapi import HTTPException, status

from ..models.complaints import complaint_model
from .user_services import authenticate_access_token
from ..config import settings

# Import ML and Notification modules
from ..ml.inference.predict import predict_complaint, geocode_location
from ..ml.inference.duplicate_detector import detect_duplicate
from ..llm.email_generator import generate_email_notification

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
        "history": complaint.get("history", []),
        "ml_output": complaint.get("ml_output", {}),
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
    
    # 1. Initialize Complaint Model
    complaint = complaint_model(data.model_dump(), user)
    
    # 2. Trigger AI Analysis
    ai_metrics = predict_complaint(data.text)
    
    # 3. Trigger Duplicate Detection
    is_dup, dup_group_id = detect_duplicate(db, data.text, data.user_selected_department)
    
    # 4. Trigger Geocoding (based on user address)
    user_addr = user.get("address", {})
    lat, lng = geocode_location(user_addr.get("city", ""), user_addr.get("pin_code", ""))
    
    # 5. Populate ML and location fields
    complaint["ml_output"].update({
        "urgency_score": ai_metrics["urgency_score"],
        "priority": ai_metrics["priority"],
        "delay_risk": ai_metrics["delay_risk"],
        "is_duplicate": is_dup,
        "duplicate_group_id": dup_group_id,
        "sentiment": ai_metrics["sentiment"],
        "sentiment_score": ai_metrics["sentiment_score"],
        "ai_detected_department": ai_metrics["ai_detected_department"],
        "predicted_hours": ai_metrics["predicted_hours"],
        "latitude": lat,
        "longitude": lng
    })
    
    # Update default tracking details
    complaint["history"].append({
        "status": "pending",
        "message": f"AI Assessment complete: detected priority is {ai_metrics['priority'].upper()} with {ai_metrics['sentiment'].upper()} sentiment.",
        "timestamp": datetime.now(timezone.utc)
    })
    
    # 6. Save complaint to database
    result = db["complaints"].insert_one(complaint)
    saved_complaint = db["complaints"].find_one({"_id": result.inserted_id})
    
    # 7. Create internal notification
    db["notifications"].insert_one({
        "user_id": str(user["_id"]),
        "message": f"Complaint submitted. AI Category: {ai_metrics['ai_detected_department']} | Priority: {ai_metrics['priority'].upper()}.",
        "read": False,
        "created_at": datetime.now(timezone.utc)
    })
    
    # 8. Send simulated/real email notification
    smtp_settings = {
        "SMTP_HOST": settings.SMTP_HOST,
        "SMTP_PORT": settings.SMTP_PORT,
        "SMTP_USER": settings.SMTP_USER,
        "SMTP_PASSWORD": settings.SMTP_PASSWORD
    }
    try:
        generate_email_notification(
            to_email=user["email"],
            citizen_name=user["full_name"],
            complaint_id=str(saved_complaint["_id"]),
            status="pending",
            text=data.text,
            smtp_settings=smtp_settings
        )
    except Exception as e:
        print("⚠️ Warning: Failed to send submission email notification:", str(e))
        
    return serialize_complaint(saved_complaint)

def get_user_complaints(db, access_token: str):
    user = authenticate_access_token(db, access_token, role="user")
    complaints = db["complaints"].find({"user_id": str(user["_id"])}).sort("created_at", -1)

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
    history_message = "Complaint updated: "
    changes = []
    
    if data.text is not None and data.text != complaint["text"]:
        update_data["text"] = data.text
        # Re-run AI analysis if text changed
        ai_metrics = predict_complaint(data.text)
        is_dup, dup_group_id = detect_duplicate(db, data.text, data.user_selected_department)
        
        # Populate updated ML metrics
        update_data["ml_output"] = dict(complaint.get("ml_output", {}))
        update_data["ml_output"].update({
            "urgency_score": ai_metrics["urgency_score"],
            "priority": ai_metrics["priority"],
            "delay_risk": ai_metrics["delay_risk"],
            "is_duplicate": is_dup,
            "duplicate_group_id": dup_group_id,
            "sentiment": ai_metrics["sentiment"],
            "sentiment_score": ai_metrics["sentiment_score"],
            "ai_detected_department": ai_metrics["ai_detected_department"],
            "predicted_hours": ai_metrics["predicted_hours"]
        })
        changes.append("text updated and AI analysis re-evaluated")
        
    if data.user_selected_department is not None and data.user_selected_department != complaint["user_selected_department"]:
        update_data["user_selected_department"] = data.user_selected_department
        changes.append(f"department changed to {data.user_selected_department}")

    if not update_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Provide at least one complaint field to update.",
        )

    now = datetime.now(timezone.utc)
    update_data["updated_at"] = now
    
    # Append to history
    new_history = list(complaint.get("history", []))
    new_history.append({
        "status": complaint["status"],
        "message": f"Citizen updated details: {', '.join(changes)}.",
        "timestamp": now
    })
    update_data["history"] = new_history

    db["complaints"].update_one(
        {"_id": complaint["_id"]},
        {"$set": update_data},
    )
    updated_complaint = db["complaints"].find_one({"_id": complaint["_id"]})

    return serialize_complaint(updated_complaint)

def track_complaint(db, complaint_id: str, access_token: str):
    payload = authenticate_access_token(db, access_token, role="user")
    
    # We can also track as department/admin so use the general authentication
    from ..security import decode_access_token
    claims = decode_access_token(access_token)
    role = claims.get("role")
    
    complaint = _get_complaint_or_404(db, complaint_id)
    
    if role == "user" and complaint.get("user_id") != claims.get("sub"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can track only your own complaints.",
        )
    
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
