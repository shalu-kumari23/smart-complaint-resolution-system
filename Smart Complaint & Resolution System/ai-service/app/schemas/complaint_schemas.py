from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

from .user_schemas import AddressSchema


# -------------------------
# USER INPUT
# -------------------------
class ComplaintCreate(BaseModel):
    text: str = Field(..., min_length=10, max_length=1000)
    user_selected_department: str = Field(..., min_length=2, max_length=100)

    model_config = ConfigDict(from_attributes=True, extra="forbid")


class ComplaintUpdate(BaseModel):
    text: Optional[str] = Field(default=None, min_length=10, max_length=1000)
    user_selected_department: Optional[str] = Field(default=None, min_length=2, max_length=100)

    model_config = ConfigDict(from_attributes=True, extra="forbid")


class ComplaintUserInfo(BaseModel):
    full_name: str
    age: int
    address: AddressSchema

    model_config = ConfigDict(from_attributes=True)


# -------------------------
# USER RESPONSE
# -------------------------
class ComplaintResponse(BaseModel):
    id: str
    user_id: str
    text: str
    department: str
    status: str
    action_taken: Optional[str] = None
    created_at: datetime
    resolved_at: Optional[datetime] = None
    user: ComplaintUserInfo

    model_config = ConfigDict(from_attributes=True)
