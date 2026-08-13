from datetime import datetime, timezone


def user_model(data):
    return {
        "full_name": data["full_name"],
        "username": data["username"].lower(),
        "email": data["email"],
        "password": data["password"],
        "role": data["role"],
        "department": data.get("department"),
        "age": data.get("age"),
        "guardian_consent": data.get("guardian_consent", False),
        "address": data.get("address"),

        "created_at": datetime.now(timezone.utc),
        "is_active": True
    }
