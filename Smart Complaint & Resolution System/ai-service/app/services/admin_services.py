from collections import defaultdict
from datetime import datetime, timezone

from bson import ObjectId
from fastapi import HTTPException, status
from pymongo.errors import DuplicateKeyError

from ..security import (
    create_access_token,
    decode_access_token,
    hash_password,
    is_password_hashed,
    verify_password,
)
from .complaint_services import serialize_complaint
from .user_services import serialize_user


def _normalize_admin_identity(mail_id: str, user_id: str):
    return mail_id.strip().lower(), user_id.strip().lower()


def _serialize_admin(admin):
    return {
        "id": str(admin["_id"]),
        "mail_id": admin["mail_id"],
        "user_id": admin["user_id"],
        "created_at": admin["created_at"],
        "updated_at": admin["updated_at"],
    }


def require_admin(db, access_token: str):
    payload = decode_access_token(access_token)
    if payload["role"] != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access token role is not allowed for this action.",
        )

    subject = payload["sub"]
    if not ObjectId.is_valid(subject):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid access token subject.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    admin = db["admins"].find_one({"_id": ObjectId(subject)})
    if admin is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired admin access token.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return admin


def create_admin(db, data):
    existing_admin = db["admins"].find_one({})
    if existing_admin is not None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: This operation is not permitted.",
        )

    mail_id, user_id = _normalize_admin_identity(data.mail_id, data.user_id)
    now = datetime.now(timezone.utc)
    admin = {
        "mail_id": mail_id,
        "user_id": user_id,
        "password": hash_password(data.password),
        "created_at": now,
        "updated_at": now,
    }

    try:
        result = db["admins"].insert_one(admin)
    except DuplicateKeyError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Admin mail id or user id already exists.",
        ) from exc

    saved_admin = db["admins"].find_one({"_id": result.inserted_id})
    return {
        "message": "Admin created successfully",
        "admin": _serialize_admin(saved_admin),
    }


def login_admin(db, data):
    mail_id, user_id = _normalize_admin_identity(data.mail_id, data.user_id)
    admin = db["admins"].find_one(
        {"mail_id": mail_id, "user_id": user_id}
    )
    if admin is None or not verify_password(data.password, admin["password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid admin credentials.",
        )

    if not is_password_hashed(admin["password"]):
        upgraded_password = hash_password(data.password)
        db["admins"].update_one(
            {"_id": admin["_id"]},
            {"$set": {"password": upgraded_password, "updated_at": datetime.now(timezone.utc)}},
        )
        admin["password"] = upgraded_password

    access_token = create_access_token(str(admin["_id"]), "admin")

    return {
        "message": "Admin login successful",
        "access_token": access_token,
        "token_type": "bearer",
        "admin": _serialize_admin(admin),
    }


def update_admin_password(db, data, access_token: str):
    admin = require_admin(db, access_token)
    if not verify_password(data.current_password, admin["password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Current password is incorrect.",
        )

    db["admins"].update_one(
        {"_id": admin["_id"]},
        {
            "$set": {
                "password": hash_password(data.new_password),
                "updated_at": datetime.now(timezone.utc),
            }
        },
    )

    return {"message": "Admin password updated successfully."}


def replace_admin(db, data, access_token: str):
    current_admin = require_admin(db, access_token)
    mail_id, user_id = _normalize_admin_identity(data.mail_id, data.user_id)
    now = datetime.now(timezone.utc)
    new_admin = {
        "mail_id": mail_id,
        "user_id": user_id,
        "password": hash_password(data.password),
        "created_at": now,
        "updated_at": now,
    }

    try:
        result = db["admins"].insert_one(new_admin)
    except DuplicateKeyError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Admin mail id or user id already exists.",
        ) from exc

    db["admins"].delete_one({"_id": current_admin["_id"]})
    saved_admin = db["admins"].find_one({"_id": result.inserted_id})

    return {
        "message": "New admin created and previous admin deleted successfully.",
        "access_token": create_access_token(str(saved_admin["_id"]), "admin"),
        "token_type": "bearer",
        "admin": _serialize_admin(saved_admin),
    }


def get_department_officer_overview(db, access_token: str):
    require_admin(db, access_token)

    grouped_officers = defaultdict(list)
    cursor = db["users"].find(
        {"role": "department"},
        {
            "password": 0,
            "is_active": 0,
        },
    )

    for officer in cursor:
        grouped_officers[officer.get("department", "Unassigned")].append(
            {
                "full_name": officer.get("full_name", ""),
                "username": officer.get("username", ""),
                "email": officer.get("email", ""),
                "department": officer.get("department", ""),
                "created_at": officer.get("created_at"),
            }
        )

    return {
        "departments": [
            {
                "department": department,
                "officer_count": len(officers),
                "officers": officers,
            }
            for department, officers in sorted(grouped_officers.items())
        ]
    }


def _serialize_department_record(db, department):
    department_name = department["name"]
    return {
        "id": str(department["_id"]),
        "name": department_name,
        "description": department.get("description"),
        "state": department.get("state"),
        "city": department.get("city"),
        "complaint_count": db["complaints"].count_documents(
            {"user_selected_department": department_name}
        ),
        "officer_count": db["users"].count_documents(
            {"role": "department", "department": department_name}
        ),
        "created_at": department["created_at"],
        "updated_at": department["updated_at"],
    }


def get_departments(db, access_token: str):
    require_admin(db, access_token)
    departments = db["departments"].find().sort("name", 1)
    return [_serialize_department_record(db, department) for department in departments]


def add_department(db, data, access_token: str):
    require_admin(db, access_token)

    now = datetime.now(timezone.utc)
    department = {
        "name": data.name.strip(),
        "description": data.description.strip() if data.description else None,
        "state": data.state.strip() if data.state else None,
        "city": data.city.strip() if data.city else None,
        "created_at": now,
        "updated_at": now,
    }

    try:
        result = db["departments"].insert_one(department)
    except DuplicateKeyError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Department already exists.",
        ) from exc

    saved_department = db["departments"].find_one({"_id": result.inserted_id})
    return _serialize_department_record(db, saved_department)


def update_department(db, department_id: str, data, access_token: str):
    require_admin(db, access_token)

    if not ObjectId.is_valid(department_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid department id.",
        )

    department = db["departments"].find_one({"_id": ObjectId(department_id)})
    if department is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Department not found.",
        )

    update_data = {}
    if data.name is not None:
        update_data["name"] = data.name.strip()
    if data.description is not None:
        update_data["description"] = data.description.strip()
    if data.state is not None:
        update_data["state"] = data.state.strip()
    if data.city is not None:
        update_data["city"] = data.city.strip()

    if not update_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Provide at least one department field to update.",
        )

    update_data["updated_at"] = datetime.now(timezone.utc)

    old_name = department["name"]
    new_name = update_data.get("name", old_name)

    try:
        db["departments"].update_one(
            {"_id": department["_id"]},
            {"$set": update_data},
        )
    except DuplicateKeyError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Department already exists.",
        ) from exc

    if new_name != old_name:
        db["users"].update_many(
            {"role": "department", "department": old_name},
            {"$set": {"department": new_name}},
        )
        db["complaints"].update_many(
            {"user_selected_department": old_name},
            {"$set": {"user_selected_department": new_name}},
        )

    updated_department = db["departments"].find_one({"_id": department["_id"]})
    return _serialize_department_record(db, updated_department)


def get_all_complaints_for_admin(db, access_token: str, limit: int = 25, status: str | None = None, priority: str | None = None, department: str | None = None):
    require_admin(db, access_token)
    
    query = {}
    if status:
        query["status"] = status
    if priority:
        query["priority"] = priority
    if department:
        query["user_selected_department"] = department

    complaints = db["complaints"].find(query).sort("created_at", -1).limit(limit)
    return [serialize_complaint(complaint) for complaint in complaints]


def get_department_complaints_for_admin(db, department_id: str, access_token: str):
    require_admin(db, access_token)

    if not ObjectId.is_valid(department_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid department id.",
        )

    department = db["departments"].find_one({"_id": ObjectId(department_id)})
    if department is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Department not found.",
        )

    complaints = db["complaints"].find(
        {"user_selected_department": department["name"]}
    ).sort("created_at", -1)

    return {
        "department": _serialize_department_record(db, department),
        "complaints": [serialize_complaint(complaint) for complaint in complaints],
    }


def get_user_complaints_for_admin(db, user_id: str, access_token: str):
    require_admin(db, access_token)

    if not ObjectId.is_valid(user_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid user id.",
        )

    user = db["users"].find_one(
        {"_id": ObjectId(user_id), "role": "user"},
        {"password": 0},
    )
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Citizen user not found.",
        )

    complaints = db["complaints"].find({"user_id": user_id}).sort("created_at", -1)
    return {
        "user": serialize_user(user),
        "complaints": [serialize_complaint(complaint) for complaint in complaints],
    }


def remove_user_by_admin(db, user_id: str, access_token: str, reason: str | None = None):
    require_admin(db, access_token)

    if not ObjectId.is_valid(user_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid user id.",
        )

    user = db["users"].find_one({"_id": ObjectId(user_id), "role": "user"})
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Citizen user not found.",
        )

    db["complaints"].delete_many({"user_id": user_id})
    db["users"].delete_one({"_id": user["_id"]})

    return {
        "message": "User removed from the portal. Email notification is reserved for a later phase.",
        "deleted_user_id": user_id,
        "reason": reason,
    }


def reassign_complaint(db, complaint_id: str, department_name: str, access_token: str):
    require_admin(db, access_token)

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

    # Check if department exists
    dept = db["departments"].find_one({"name": department_name})
    if dept is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Department not found.",
        )

    db["complaints"].update_one(
        {"_id": complaint["_id"]},
        {"$set": {"user_selected_department": department_name, "updated_at": datetime.now(timezone.utc)}}
    )

    return {"message": f"Complaint reassigned to {department_name} successfully."}


def remove_complaint_by_admin(db, complaint_id: str, access_token: str):
    require_admin(db, access_token)

    if not ObjectId.is_valid(complaint_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid complaint id.",
        )

    result = db["complaints"].delete_one({"_id": ObjectId(complaint_id)})
    if result.deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Complaint not found.",
        )

    return {"message": "Complaint deleted successfully."}


def get_analytics(db, access_token: str):
    require_admin(db, access_token)

    # Status distribution
    pipeline_status = [{"$group": {"_id": "$status", "count": {"$sum": 1}}}]
    status_counts = list(db["complaints"].aggregate(pipeline_status))
    by_status = {item["_id"]: item["count"] for item in status_counts}

    # Department distribution
    pipeline_dept = [{"$group": {"_id": "$user_selected_department", "count": {"$sum": 1}}}]
    dept_counts = list(db["complaints"].aggregate(pipeline_dept))
    by_department = {item["_id"]: item["count"] for item in dept_counts}

    # Priority distribution
    pipeline_priority = [{"$group": {"_id": "$priority", "count": {"$sum": 1}}}]
    priority_counts = list(db["complaints"].aggregate(pipeline_priority))
    by_priority = {item["_id"] or "unassigned": item["count"] for item in priority_counts}

    # Total counts
    total_complaints = db["complaints"].count_documents({})
    total_users = db["users"].count_documents({"role": "user"})
    total_officers = db["users"].count_documents({"role": "department"})

    return {
        "by_status": by_status,
        "by_department": by_department,
        "by_priority": by_priority,
        "total_complaints": total_complaints,
        "total_users": total_users,
        "total_officers": total_officers,
        "avg_resolution_hours": 42.5,  # Placeholder
        "duplicate_rate": 12.3,       # Placeholder
        "ai_accuracy": 94.1           # Placeholder
    }
