import re
import random
from typing import Dict, Any, Tuple

# Predefined keywords for Category Detection
CATEGORY_KEYWORDS = {
    "Water Supply": ["water", "leak", "pipe", "tap", "drainage", "supply", "drinking", "contamination", "chlorine", "no water"],
    "Electricity": ["electricity", "power", "shock", "wire", "voltage", "blackout", "load shedding", "sparking", "meter", "current"],
    "Roads": ["road", "pothole", "street", "highway", "asphalt", "flyover", "pavement", "construction", "crack", "tar"],
    "Sanitation": ["garbage", "trash", "waste", "cleaning", "sewage", "dump", "dirty", "odour", "litter", "unhygienic"],
    "Healthcare": ["hospital", "clinic", "doctor", "nurse", "medicine", "health", "disease", "outbreak", "hygiene", "ambulance"],
    "Education": ["school", "college", "teacher", "student", "classroom", "books", "fees", "syllabus", "education", "scholarship"]
}

# Predefined keywords for Priority / Urgency Detection
URGENT_KEYWORDS = ["danger", "emergency", "sparking", "flooding", "broken wire", "accident", "injury", "death", "immediate", "severe", "life-threatening", "critical", "shock"]
MEDIUM_KEYWORDS = ["leakage", "dirty", "bill", "not working", "smell", "delay", "damaged", "repair", "maintenance"]

# Predefined keywords for Sentiment Analysis
POSITIVE_KEYWORDS = ["good", "great", "excellent", "thanks", "satisfied", "helpful", "happy", "thank you", "appreciate", "resolved"]
NEGATIVE_KEYWORDS = ["bad", "worst", "terrible", "useless", "broken", "dirty", "angry", "frustrated", "delay", "careless", "lazy", "horrible", "awful", "unacceptable", "hazardous"]

# Geocoding Database for popular Indian Cities
CITY_COORDINATES = {
    "mumbai": (19.0760, 72.8777),
    "delhi": (28.7041, 77.1025),
    "bangalore": (12.9716, 77.5946),
    "hyderabad": (17.3850, 78.4867),
    "ahmedabad": (23.0225, 72.5714),
    "chennai": (13.0827, 80.2707),
    "kolkata": (22.5726, 88.3639),
    "pune": (18.5204, 73.8567),
    "jaipur": (26.9124, 75.7873),
    "lucknow": (26.8467, 80.9462),
    "patna": (25.5941, 85.1376),
    "bhopal": (23.2599, 77.4126),
    "ranchi": (23.3441, 85.3096),
    "chandigarh": (30.7333, 76.7794)
}

def predict_complaint(text: str) -> Dict[str, Any]:
    """
    Perform Category Detection, Priority/Urgency Assessment, Sentiment Analysis, 
    and Resolution Time Prediction based on complaint text.
    """
    text_lower = text.lower()

    # 1. Category / Department Detection
    detected_category = "Other"
    max_matches = 0
    for category, keywords in CATEGORY_KEYWORDS.items():
        matches = sum(1 for keyword in keywords if keyword in text_lower)
        if matches > max_matches:
            max_matches = matches
            detected_category = category

    # 2. Priority & Urgency Score Assessment
    urgency_score = 0.2  # Base low urgency
    
    # Count urgent keyword matches
    urgent_matches = sum(1 for keyword in URGENT_KEYWORDS if keyword in text_lower)
    medium_matches = sum(1 for keyword in MEDIUM_KEYWORDS if keyword in text_lower)
    
    if urgent_matches > 0:
        priority = "high"
        urgency_score = min(0.95, 0.7 + (urgent_matches * 0.05))
    elif medium_matches > 0:
        priority = "medium"
        urgency_score = min(0.65, 0.4 + (medium_matches * 0.05))
    else:
        priority = "low"
        urgency_score = max(0.1, 0.2 - (random.random() * 0.05))

    # 3. Sentiment Analysis
    pos_matches = sum(1 for keyword in POSITIVE_KEYWORDS if keyword in text_lower)
    neg_matches = sum(1 for keyword in NEGATIVE_KEYWORDS if keyword in text_lower)
    
    sentiment_score = 0.0
    if pos_matches > neg_matches:
        sentiment = "positive"
        sentiment_score = min(1.0, (pos_matches - neg_matches) * 0.2)
    elif neg_matches > pos_matches:
        sentiment = "negative"
        sentiment_score = max(-1.0, (pos_matches - neg_matches) * 0.2)
    else:
        sentiment = "neutral"
        sentiment_score = 0.0

    # 4. Resolution Time Prediction (Hours)
    # Default SLA based on priority
    if priority == "high":
        predicted_hours = 24
    elif priority == "medium":
        predicted_hours = 48
    else:
        predicted_hours = 72

    # Slight adjustments based on category complexity
    if detected_category in ["Roads", "Healthcare"]:
        predicted_hours += 12
    elif detected_category in ["Electricity"]:
        predicted_hours = max(12, predicted_hours - 12) # Electricity gets faster response

    return {
        "ai_detected_department": detected_category,
        "priority": priority,
        "urgency_score": float(round(urgency_score, 2)),
        "sentiment": sentiment,
        "sentiment_score": float(round(sentiment_score, 2)),
        "predicted_hours": predicted_hours,
        "delay_risk": float(round(0.85 if priority == "high" else 0.45 if priority == "medium" else 0.15, 2))
    }

def geocode_location(city: str, pincode: str) -> Tuple[float, float]:
    """
    Geocodes city & pincode into latitude and longitude with minor random jitter 
    to represent distinct scatter points on the map.
    """
    clean_city = str(city).strip().lower()
    
    # Try finding coordinates for the city
    base_lat, base_lng = CITY_COORDINATES.get(clean_city, (20.5937, 78.9629)) # Default to Center of India
    
    # Add minor jitter (+-0.015 degrees) so that multiple complaints in same city disperse
    jitter_lat = (random.random() - 0.5) * 0.03
    jitter_lng = (random.random() - 0.5) * 0.03
    
    return base_lat + jitter_lat, base_lng + jitter_lng