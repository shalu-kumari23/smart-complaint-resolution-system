from fastapi import APIRouter, Depends
from datetime import datetime, timezone
from ..auth_dependencies import get_bearer_token
from ..database import get_database
from ..services.user_services import authenticate_access_token

router = APIRouter(prefix="/notifications", tags=["Notifications"])

def serialize_notification(noti):
    return {
        "id": str(noti["_id"]),
        "user_id": noti["user_id"],
        "message": noti["message"],
        "read": noti.get("read", False),
        "created_at": noti["created_at"]
    }

@router.get("/list")
def list_notifications(
    access_token: str = Depends(get_bearer_token),
    db=Depends(get_database)
):
    user = authenticate_access_token(db, access_token, role="user")
    cursor = db["notifications"].find({"user_id": str(user["_id"])}).sort("created_at", -1)
    return [serialize_notification(noti) for noti in cursor]

@router.put("/read-all")
def read_all_notifications(
    access_token: str = Depends(get_bearer_token),
    db=Depends(get_database)
):
    user = authenticate_access_token(db, access_token, role="user")
    db["notifications"].update_many(
        {"user_id": str(user["_id"]), "read": False},
        {"$set": {"read": True}}
    )
    return {"message": "All notifications marked as read."}
