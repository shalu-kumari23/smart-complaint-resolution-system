from fastapi import APIRouter, Depends

from ..auth_dependencies import get_bearer_token
from ..database import get_database
from ..schemas.complaint_schemas import ComplaintCreate, ComplaintUpdate
from ..services.complaint_services import (
    create_complaint,
    get_user_complaints,
    update_user_complaint,
)

router = APIRouter(prefix="/complaints", tags=["Complaints"])


@router.post("/create")
def create(
    data: ComplaintCreate,
    access_token: str = Depends(get_bearer_token),
    db=Depends(get_database),
):
    complaint = create_complaint(db, data, access_token)
    return {"message": "Complaint created", "complaint": complaint}


@router.get("/list")
def list_all(
    access_token: str = Depends(get_bearer_token),
    db=Depends(get_database),
):
    return get_user_complaints(db, access_token)


@router.put("/update/{complaint_id}")
def update(
    complaint_id: str,
    data: ComplaintUpdate,
    access_token: str = Depends(get_bearer_token),
    db=Depends(get_database),
):
    return update_user_complaint(db, complaint_id, data, access_token)


@router.get("/{complaint_id}/track")
def track(
    complaint_id: str,
    access_token: str = Depends(get_bearer_token),
    db=Depends(get_database),
):
    from ..services.complaint_services import track_complaint
    return track_complaint(db, complaint_id, access_token)
