from fastapi import APIRouter, Depends, HTTPException, status
from bson import ObjectId
from ..auth_dependencies import get_bearer_token
from ..database import get_database
from ..services.dept_services import authenticate_access_token
from ..llm.summarizer import summarize_complaint

router = APIRouter(prefix="/department", tags=["Department Assistant"])

@router.get("/assistant/{complaint_id}")
def get_complaint_assistant_suggestions(
    complaint_id: str,
    access_token: str = Depends(get_bearer_token),
    db=Depends(get_database)
):
    # Verify caller is a department officer
    officer = authenticate_access_token(db, access_token, role="department")
    
    if not ObjectId.is_valid(complaint_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid complaint id."
        )
        
    complaint = db["complaints"].find_one({"_id": ObjectId(complaint_id)})
    if complaint is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Complaint not found."
        )
        
    # Check department access
    if complaint["user_selected_department"] != officer["department"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can access assistant suggestions only for complaints assigned to your department."
        )
        
    text = complaint.get("text", "")
    category = complaint.get("user_selected_department", "Other")
    
    # Priority
    ml_output = complaint.get("ml_output", {})
    priority = ml_output.get("priority", "low")
    
    suggestions = summarize_complaint(text, category, priority)
    return suggestions
