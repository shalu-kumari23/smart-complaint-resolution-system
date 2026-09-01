import os
from datetime import datetime, timedelta, timezone
from typing import Optional, List, Dict, Any
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from .config import settings
from .database import get_database
from .ml.inference.predict import predict_complaint
from .ml.inference.duplicate_detector import detect_duplicate, check_duplicates_in_list


app = FastAPI(title="AI-Powered Smart Complaint & Resolution AI Service")

# Setup CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Set Gemini API Key in environment if configured
if settings.GEMINI_API_KEY:
    os.environ["GEMINI_API_KEY"] = settings.GEMINI_API_KEY

# Pydantic Schemas
class TextRequest(BaseModel):
    text: str

class PredictResolutionRequest(BaseModel):
    category: str
    priority: str

class DuplicateCheckRequest(BaseModel):
    text: str
    category: Optional[str] = None
    threshold: Optional[float] = 0.5
    existing_complaints: Optional[List[Dict[str, Any]]] = None

class AnalyzeRequest(BaseModel):
    text: str
    category: Optional[str] = None
    location: Optional[str] = None

# Mappings
DEPARTMENT_ROUTING = {
    "Roads": "Roads Department",
    "Electricity": "Electricity Department",
    "Street Light": "Electricity Department",
    "Water Supply": "Water Department",
    "Water": "Water Department",
    "Sanitation": "Sanitation Department",
    "Garbage": "Sanitation Department",
    "Drainage": "Drainage Department",
    "Transport": "Transport Department",
    "Public Safety": "Public Safety Department",
    "Healthcare": "Healthcare Department",
    "Education": "Education Department",
    "Other": "General Administration Department"
}

@app.get("/health")
def health():
    db = get_database()
    return {
        "status": "healthy",
        "database_connected": db is not None,
        "fallback_mode": not bool(settings.GEMINI_API_KEY),
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

@app.post("/classify")
def classify(payload: TextRequest):
    metrics = predict_complaint(payload.text)
    # Simple rule based confidence calculation
    confidence = 0.85 if metrics["ai_detected_department"] != "Other" else 0.40
    return {
        "category": metrics["ai_detected_department"],
        "confidence": confidence
    }

@app.post("/priority")
def priority(payload: TextRequest):
    metrics = predict_complaint(payload.text)
    score = int(metrics["urgency_score"] * 100)
    reason = f"Urgency score is {score}%, based on infrastructure/public safety keyword markers."
    return {
        "priority": metrics["priority"].upper(),
        "priorityScore": score,
        "reason": reason
    }

@app.post("/sentiment")
def sentiment(payload: TextRequest):
    metrics = predict_complaint(payload.text)
    urgency_score = int(metrics["urgency_score"] * 100)
    return {
        "sentiment": metrics["sentiment"].upper(),
        "urgencyScore": urgency_score
    }

@app.post("/resolution-prediction")
def resolution_prediction(payload: PredictResolutionRequest):
    # Rule based SLA
    priority = payload.priority.upper()
    category = payload.category
    
    if priority == "CRITICAL":
        hours = 12
    elif priority == "HIGH":
        hours = 24
    elif priority == "MEDIUM":
        hours = 48
    else:
        hours = 72

    if category in ["Roads", "Healthcare"]:
        hours += 12
    elif category == "Electricity" or category == "Street Light":
        hours = max(6, hours - 6)

    eta_date = datetime.now(timezone.utc) + timedelta(hours=hours)
    return {
        "estimatedHours": hours,
        "estimatedDate": eta_date.isoformat(),
        "confidence": 0.80
    }

@app.post("/duplicate-check")
def duplicate_check(payload: DuplicateCheckRequest):
    db = get_database()
    threshold = payload.threshold or 0.5
    
    # Case A: Existing complaints are provided in the payload
    if payload.existing_complaints is not None:
        is_dup, dup_list = check_duplicates_in_list(payload.text, payload.existing_complaints, threshold)
        return {
            "isDuplicate": is_dup,
            "similarComplaints": dup_list
        }
        
    # Case B: Fetch from database
    if db is not None:
        is_dup, dup_list = detect_duplicate(db, payload.text, payload.category or "", threshold)
        return {
            "isDuplicate": is_dup,
            "similarComplaints": dup_list
        }
        
    return {
        "isDuplicate": False,
        "similarComplaints": []
    }

@app.post("/analyze")
def analyze(payload: AnalyzeRequest):
    # 1. Base prediction metrics
    metrics = predict_complaint(payload.text)
    
    category = metrics["ai_detected_department"]
    priority = metrics["priority"].upper()
    sentiment = metrics["sentiment"].upper()
    urgency_score = int(metrics["urgency_score"] * 100)
    
    # Overwrite category if explicitly provided
    if payload.category:
        category = payload.category

    # 2. Get Department Recommendation
    recommended_dept = DEPARTMENT_ROUTING.get(category, DEPARTMENT_ROUTING["Other"])
    dept_confidence = 0.90 if category in DEPARTMENT_ROUTING else 0.40

    # 3. Predict Resolution Hours
    res_payload = PredictResolutionRequest(category=category, priority=priority)
    res_prediction = resolution_prediction(res_payload)
    
    # 4. Generate Summary & Recommended Action
    from .llm.summarizer import summarize_complaint
    summary_data = summarize_complaint(payload.text, category, priority.lower())
    
    # 5. Check Duplicates against database
    db = get_database()
    is_duplicate = False
    duplicates = []
    if db is not None:
        is_duplicate, duplicates = detect_duplicate(db, payload.text, category, threshold=0.45)

    return {
        "category": category,
        "categoryConfidence": 0.85 if category != "Other" else 0.40,
        "priority": priority,
        "priorityScore": urgency_score, # Mapping priorityScore to the urgency_score scale
        "sentiment": sentiment,
        "urgencyScore": urgency_score,
        "department": recommended_dept,
        "departmentConfidence": dept_confidence,
        "summary": summary_data.get("summary", payload.text[:100] + "..."),
        "suggestedAction": summary_data.get("suggested_action", "Manual review required."),
        "draftResponse": summary_data.get("draft_response", "Thank you for submitting your complaint. We are reviewing it."),
        "estimatedResolutionHours": res_prediction["estimatedHours"],
        "estimatedDate": res_prediction["estimatedDate"],
        "isDuplicate": is_duplicate,
        "duplicates": duplicates
    }
