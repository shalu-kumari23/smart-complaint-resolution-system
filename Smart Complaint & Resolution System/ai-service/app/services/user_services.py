from typing import Any

from bson import ObjectId
from fastapi import HTTPException, status
from pymongo.errors import DuplicateKeyError

from ..models.users import user_model
from ..security import (
    create_access_token,
    decode_access_token,
    hash_password,
    is_password_hashed,
    verify_password,
)


def normalize_identifier(value: str) -> str:
    return value.strip().lower()


def serialize_user(user):
    return {
        "id": str(user["_id"]),
        "full_name": user["full_name"],
        "username": user["username"],
        "email": user["email"],
        "age": user["age"],
        "guardian_consent": user["guardian_consent"],
        "address": user["address"],
        "role": user["role"],
        "created_at": user["created_at"],
    }


def get_user_by_identifier(db, identifier: str, role: str | None = None):
    normalized = normalize_identifier(identifier)
    query: dict[str, Any] = {"$or": [{"email": normalized}, {"username": normalized}]}

    if role is not None:
        query["role"] = role

    return db["users"].find_one(query)


def authenticate_access_token(db, access_token: str, role: str):
    payload = decode_access_token(access_token)
    if payload["role"] != role:
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

    user = db["users"].find_one(
        {"_id": ObjectId(subject), "role": role, "is_active": True}
    )
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired access token.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


def ensure_unique_email_username(db, email: str, username: str):
    existing = db["users"].find_one(
        {"$or": [{"email": normalize_identifier(email)}, {"username": normalize_identifier(username)}]}
    )
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email or username already exists.",
        )


def create_user(db, data):
    payload = data.model_dump()
    payload["email"] = normalize_identifier(payload["email"])
    payload["username"] = normalize_identifier(payload["username"])
    payload["role"] = "user"
    payload["password"] = hash_password(payload["password"])

    ensure_unique_email_username(db, payload["email"], payload["username"])

    user = user_model(payload)
    try:
        result = db["users"].insert_one(user)
    except DuplicateKeyError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email or username already exists.",
        ) from exc
    saved_user = db["users"].find_one({"_id": result.inserted_id})

    return serialize_user(saved_user)


def login_user(db, data):
    user = get_user_by_identifier(db, data.identifier, role="user")
    if user is None or not verify_password(data.password, user["password"]) or not user.get("is_active", True):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid user credentials.",
        )

    if not is_password_hashed(user["password"]):
        upgraded_password = hash_password(data.password)
        db["users"].update_one(
            {"_id": user["_id"]},
            {"$set": {"password": upgraded_password}},
        )
        user["password"] = upgraded_password

    access_token = create_access_token(str(user["_id"]), user["role"])

    return {
        "message": "User login successful",
        "access_token": access_token,
        "token_type": "bearer",
        "user": serialize_user(user),
    }


def delete_current_user(db, access_token: str):
    user = authenticate_access_token(db, access_token, role="user")
    user_id = str(user["_id"])

    db["complaints"].delete_many({"user_id": user_id})
    db["users"].delete_one({"_id": user["_id"]})

    return {
        "message": "User account deleted successfully.",
        "deleted_user_id": user_id,
    }
