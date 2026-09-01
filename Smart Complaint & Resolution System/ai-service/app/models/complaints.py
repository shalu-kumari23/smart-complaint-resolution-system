from datetime import datetime, timezone

def complaint_model(data, user):
    now = datetime.now(timezone.utc)
    return {
        "user_id": str(user["_id"]),
        "text": data["text"],
        "user_selected_department": data["user_selected_department"],
        "status": "pending",
        "created_at": now,
        "updated_at": now,

        "action_taken": None,
        "resolved_at": None,
        "user_snapshot": {
            "full_name": user["full_name"],
            "age": user["age"],
            "address": user["address"],
        },

        # Historical steps for premium vertical tracking timeline
        "history": [
            {
                "status": "pending",
                "message": "Complaint submitted successfully.",
                "timestamp": now
            }
        ],

        "ml_output": {
            "urgency_score": None,
            "priority": "low",
            "delay_risk": None,
            "is_duplicate": False,
            "duplicate_group_id": None,
            "sentiment": "neutral",
            "sentiment_score": 0.0,
            "ai_detected_department": None,
            "predicted_hours": 72,
            "latitude": None,
            "longitude": None
        }
    }
