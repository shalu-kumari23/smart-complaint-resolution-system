from fastapi import APIRouter, Depends

from ..auth_dependencies import get_bearer_token
from ..database import get_database
from ..schemas.admin_schemas import (
    AdminComplaintAssignRequest,
    AdminCreate,
    AdminDeleteUserRequest,
    AdminDepartmentCreate,
    AdminDepartmentUpdate,
    AdminLogin,
    AdminPasswordUpdate,
    AdminReplaceRequest,
)
from ..services.admin_services import (
    add_department,
    create_admin,
    get_all_complaints_for_admin,
    get_department_complaints_for_admin,
    get_departments,
    get_department_officer_overview,
    get_user_complaints_for_admin,
    login_admin,
    remove_user_by_admin,
    replace_admin,
    update_admin_password,
    update_department,
)

router = APIRouter(prefix="/admin", tags=["Admin"])


@router.post("/create")
def create(data: AdminCreate, db=Depends(get_database)):
    return create_admin(db, data)


@router.post("/login")
def login(data: AdminLogin, db=Depends(get_database)):
    return login_admin(db, data)


@router.put("/password")
def password(
    data: AdminPasswordUpdate,
    access_token: str = Depends(get_bearer_token),
    db=Depends(get_database),
):
    return update_admin_password(db, data, access_token)


@router.post("/replace")
def replace(
    data: AdminReplaceRequest,
    access_token: str = Depends(get_bearer_token),
    db=Depends(get_database),
):
    return replace_admin(db, data, access_token)


@router.get("/officers")
def officers(
    access_token: str = Depends(get_bearer_token),
    db=Depends(get_database),
):
    return get_department_officer_overview(db, access_token)


@router.get("/departments")
def departments(
    access_token: str = Depends(get_bearer_token),
    db=Depends(get_database),
):
    return get_departments(db, access_token)


@router.post("/departments")
def create_department(
    data: AdminDepartmentCreate,
    access_token: str = Depends(get_bearer_token),
    db=Depends(get_database),
):
    return add_department(db, data, access_token)


@router.put("/departments/{department_id}")
def edit_department(
    department_id: str,
    data: AdminDepartmentUpdate,
    access_token: str = Depends(get_bearer_token),
    db=Depends(get_database),
):
    return update_department(db, department_id, data, access_token)


@router.get("/complaints")
def complaints(
    access_token: str = Depends(get_bearer_token),
    db=Depends(get_database),
    limit: int = 25,
    status: str | None = None,
    priority: str | None = None,
    department: str | None = None,
):
    return get_all_complaints_for_admin(db, access_token, limit, status, priority, department)


@router.get("/departments/{department_id}/complaints")
def complaints_for_department(
    department_id: str,
    access_token: str = Depends(get_bearer_token),
    db=Depends(get_database),
):
    return get_department_complaints_for_admin(db, department_id, access_token)


@router.get("/users/{user_id}/complaints")
def complaints_for_user(
    user_id: str,
    access_token: str = Depends(get_bearer_token),
    db=Depends(get_database),
):
    return get_user_complaints_for_admin(db, user_id, access_token)


@router.delete("/users/{user_id}")
def delete_user(
    user_id: str,
    data: AdminDeleteUserRequest,
    access_token: str = Depends(get_bearer_token),
    db=Depends(get_database),
):
    return remove_user_by_admin(db, user_id, access_token, data.reason)


@router.put("/complaints/{complaint_id}/assign")
def reassign(
    complaint_id: str,
    data: AdminComplaintAssignRequest,
    access_token: str = Depends(get_bearer_token),
    db=Depends(get_database),
):
    from ..services.admin_services import reassign_complaint
    return reassign_complaint(db, complaint_id, data.department, access_token)


@router.delete("/complaints/{complaint_id}")
def delete_complaint_admin(
    complaint_id: str,
    access_token: str = Depends(get_bearer_token),
    db=Depends(get_database),
):
    from ..services.admin_services import remove_complaint_by_admin
    return remove_complaint_by_admin(db, complaint_id, access_token)


@router.get("/analytics")
def analytics(
    access_token: str = Depends(get_bearer_token),
    db=Depends(get_database),
):
    from ..services.admin_services import get_analytics
    return get_analytics(db, access_token)
