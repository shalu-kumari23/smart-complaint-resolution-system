import os
import requests
import json
from typing import Dict, Any

# Local fallback templates based on department/category and sentiment
FALLBACK_SUGGESTIONS = {
    "Water Supply": {
        "actions": [
            "Dispatch a pipeline inspector to the reported location immediately.",
            "Assess the severity of the leak/contamination.",
            "Coordinate with the local water distribution unit for temporary shutoff if required.",
            "Initiate repair work and monitor pressure restoring stages."
        ],
        "draft": "Dear Citizen, thank you for reporting the water supply issue at your location. We have registered your complaint and dispatched an inspection team to locate the problem. Repair work will begin shortly. We appreciate your patience."
    },
    "Electricity": {
        "actions": [
            "Alert the area line-maintenance engineer.",
            "Verify power transformer safety and check for local grid trips.",
            "If sparking wires are reported, temporarily disconnect power to prevent hazards.",
            "Replace damaged cables/meters and restore safe supply."
        ],
        "draft": "Dear Citizen, thank you for highlighting this electrical issue. Safety is our priority; an emergency maintenance crew has been alerted to inspect the site and fix any malfunctioning lines. We expect power/safety restoration within the estimated timeframe."
    },
    "Roads": {
        "actions": [
            "Schedule a site survey by the road maintenance division.",
            "Mark the hazard/pothole with safety cones/barriers to prevent accidents.",
            "Allocate asphalt repair materials and crew.",
            "Complete tarring and level the road section."
        ],
        "draft": "Dear Citizen, we have received your complaint regarding the road conditions. A work order has been created for our road repair division to patch the damaged section. Safety markers will be placed in the interim. Thank you for your civic alert."
    },
    "Sanitation": {
        "actions": [
            "Route the municipal waste clearance vehicle to the location.",
            "Clean the accumulated garbage/clear blockages from the sewer line.",
            "Disinfect the area with sanitary spraying.",
            "Increase vigilance and waste bin collection frequency in this zone."
        ],
        "draft": "Dear Citizen, thank you for bringing this sanitation issue to our notice. Our local waste disposal team has been instructed to clear the area immediately and perform sanitary cleaning. We are committed to maintaining a clean environment."
    },
    "Healthcare": {
        "actions": [
            "Notify the local health inspector or medical officer.",
            "Inspect the hygiene standards or check patient service complaints.",
            "Conduct necessary sanitization or stock check of medicines.",
            "Report status back to the district medical administration."
        ],
        "draft": "Dear Citizen, your feedback regarding health services has been noted. Our hospital/clinic administrative team will audit the concerns raised and take swift corrective measures. We strive to provide quality healthcare."
    },
    "Education": {
        "actions": [
            "Forward the complaint to the education board or school principal.",
            "Arrange a committee meeting to review the student/facility grievance.",
            "Perform onsite verification of infrastructure or fees issues.",
            "Update regulations or provide student counselling support."
        ],
        "draft": "Dear Citizen, thank you for sharing your concern. Your grievance has been forwarded to the education supervisor. We will investigate the matter and ensure that students receive a supportive and fair academic environment."
    },
    "Other": {
        "actions": [
            "Review complaint description manually.",
            "Assign to the relevant sub-department officer.",
            "Initiate investigation and notify the user when action plan is formulated."
        ],
        "draft": "Dear Citizen, we have received your grievance. It has been routed to our administrative desk for review. We will contact you shortly with an update."
    }
}

def generate_local_response(text: str, category: str, priority: str) -> Dict[str, Any]:
    """Generates a high-quality local rule-based response when no API key is available."""
    # Create simple summary
    words = text.split()
    summary = " ".join(words[:12]) + "..." if len(words) > 12 else text
    
    dept_info = FALLBACK_SUGGESTIONS.get(category, FALLBACK_SUGGESTIONS["Other"])
    
    actions = list(dept_info["actions"])
    # Adjust actions based on priority
    if priority == "high":
        actions.insert(0, "🚨 EMERGENCY ACTION: Prioritize resolution within 24 hours.")
    
    return {
        "summary": f"Citizen has reported an issue regarding {category}. Details: {summary}",
        "suggested_action": "\n".join(f"- {act}" for act in actions),
        "draft_response": dept_info["draft"]
    }

def summarize_complaint(text: str, category: str, priority: str) -> Dict[str, Any]:
    """
    Summarizes the complaint and suggests steps + draft reply using Gemini API if configured, 
    otherwise falls back to rule-based generation.
    """
    api_key = os.environ.get("GEMINI_API_KEY")
    
    if not api_key:
        return generate_local_response(text, category, priority)
        
    # Attempt live API call to Gemini
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
    headers = {"Content-Type": "application/json"}
    
    prompt = f"""
    You are an AI assistant for ResolveAI, a smart municipal grievance system.
    A citizen submitted a complaint in the '{category}' department with '{priority}' priority.
    
    Complaint Text:
    "{text}"
    
    Provide the response in raw JSON format with three fields:
    1. "summary": A short, clear, 1-sentence summary of the core grievance.
    2. "suggested_action": A bulleted list of 3-4 recommended concrete actions the department officer should take to inspect and resolve this complaint.
    3. "draft_response": A professional, empathetic draft email reply to the citizen acknowledging their issue and outlining next steps.
    
    Make sure you return valid JSON, and nothing else (no markdown blocks like ```json).
    """
    
    payload = {
        "contents": [{
            "parts": [{"text": prompt}]
        }]
    }
    
    try:
        r = requests.post(url, headers=headers, json=payload, timeout=8)
        if r.status_code == 200:
            res_data = r.json()
            text_response = res_data["candidates"][0]["content"]["parts"][0]["text"].strip()
            
            # Clean possible markdown wrap
            if text_response.startswith("```"):
                text_response = text_response.split("```")[1]
                if text_response.startswith("json"):
                    text_response = text_response[4:]
            
            parsed = json.loads(text_response.strip())
            return {
                "summary": parsed.get("summary", ""),
                "suggested_action": parsed.get("suggested_action", ""),
                "draft_response": parsed.get("draft_response", "")
            }
    except Exception as e:
        print("Gemini API call failed, using fallback:", str(e))
        
    return generate_local_response(text, category, priority)