from fastapi import APIRouter, Depends

from ..auth_dependencies import get_bearer_token
from ..database import get_database
from ..schemas.dept_schemas import (
    DepartmentActionUpdate,
    DepartmentLogin,
    DepartmentOfficerCreate,
)
from ..services.dept_services import (
    create_department_officer,
    get_department_complaints,
    login_department_officer,
    update_complaint_by_department,
)

router = APIRouter(prefix="/department", tags=["Department"])


@router.post("/officers/create")
def create_officer(data: DepartmentOfficerCreate, db=Depends(get_database)):
    officer = create_department_officer(db, data)
    return {"message": "Department officer created", "officer": officer}


@router.post("/login")
def login(data: DepartmentLogin, db=Depends(get_database)):
    return login_department_officer(db, data)


@router.get("/complaints")
def list_department_complaints(
    access_token: str = Depends(get_bearer_token),
    db=Depends(get_database),
    status: str | None = None,
    priority: str | None = None,
):
    return get_department_complaints(db, access_token, status, priority)


@router.put("/update/{complaint_id}")
def update(
    complaint_id: str,
    data: DepartmentActionUpdate,
    access_token: str = Depends(get_bearer_token),
    db=Depends(get_database),
):
    return update_complaint_by_department(db, complaint_id, data, access_token)
