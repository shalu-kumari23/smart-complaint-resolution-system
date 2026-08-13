from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

from .user_schemas import AddressSchema, EmailValue, UsernameValue


class DepartmentOfficerCreate(BaseModel):
    full_name: str = Field(min_length=2, max_length=120)
    username: UsernameValue
    email: EmailValue
    password: str = Field(min_length=6)
    department: str = Field(min_length=2, max_length=100)

    model_config = ConfigDict(extra="forbid")


class DepartmentLogin(BaseModel):
    identifier: str = Field(min_length=3, max_length=100)
    password: str = Field(min_length=6)

    model_config = ConfigDict(extra="forbid")


# -------------------------
# DEPARTMENT ACTION INPUT
# -------------------------
class DepartmentActionUpdate(BaseModel):
    status: str = Field(..., pattern="^(open|in_progress|resolved|closed|rejected|pending)$")
    action_taken: Optional[str] = Field(default=None, max_length=500)
    resolved_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True, extra="forbid")


class DepartmentOfficerResponse(BaseModel):
    id: str
    full_name: str
    username: str
    email: str
    department: str
    role: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class DepartmentSessionResponse(BaseModel):
    message: str
    access_token: str
    token_type: str
    officer: DepartmentOfficerResponse

    model_config = ConfigDict(from_attributes=True)


# -------------------------
# DEPARTMENT VIEW
# -------------------------
class DepartmentResponse(BaseModel):
    id: str
    user_id: str
    text: str
    department: str
    status: str
    action_taken: Optional[str] = None
    created_at: datetime
    resolved_at: Optional[datetime] = None
    user: dict[str, object]

    urgency_score: Optional[float] = Field(default=None, ge=0, le=1)
    delay_risk: Optional[float] = Field(default=None, ge=0, le=1)

    model_config = ConfigDict(from_attributes=True)
