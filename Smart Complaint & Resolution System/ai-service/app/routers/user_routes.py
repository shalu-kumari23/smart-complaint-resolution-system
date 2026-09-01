from fastapi import APIRouter, Depends

from ..auth_dependencies import get_bearer_token
from ..database import get_database
from ..schemas.user_schemas import UserCreate, UserLogin
from ..services.user_services import create_user, delete_current_user, login_user

router = APIRouter(prefix="/users", tags=["Users"])


@router.post("/create")
def create(data: UserCreate, db=Depends(get_database)):
    user = create_user(db, data)
    return {"message": "User created", "user": user}


@router.post("/login")
def login(data: UserLogin, db=Depends(get_database)):
    return login_user(db, data)


@router.delete("/delete")
def delete_account(
    access_token: str = Depends(get_bearer_token),
    db=Depends(get_database),
):
    return delete_current_user(db, access_token)
