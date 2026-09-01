from fastapi import APIRouter, Depends
from ..database import get_database

router = APIRouter(tags=["Public"])

@router.get("/departments")
def list_departments(db=Depends(get_database)):
    departments = db["departments"].find({}, {"name": 1, "_id": 1})
    return [{"id": str(d["_id"]), "name": d["name"]} for d in departments]
