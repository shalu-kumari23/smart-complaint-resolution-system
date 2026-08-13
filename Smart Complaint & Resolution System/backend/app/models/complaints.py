from datetime import datetime, timezone

def complaint_model(data, user):
    return {
        "user_id": str(user["_id"]),
        "text": data["text"],
        "user_selected_department": data["user_selected_department"],
        "status": "pending",
        "created_at": datetime.now(timezone.utc),

        "action_taken": None,
        "resolved_at": None,
        "user_snapshot": {
            "full_name": user["full_name"],
            "age": user["age"],
            "address": user["address"],
        },

        "ml_output": {
            "urgency_score": None,
            "delay_risk": None,
            "is_duplicate": False,
            "duplicate_group_id": None
        }
    }
