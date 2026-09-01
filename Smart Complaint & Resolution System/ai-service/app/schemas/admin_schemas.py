from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class AdminCreate(BaseModel):
    mail_id: str = Field(pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$", min_length=5, max_length=150)
    user_id: str = Field(min_length=3, max_length=100)
    password: str = Field(min_length=6)

    model_config = ConfigDict(extra="forbid")


class AdminLogin(BaseModel):
    mail_id: str = Field(pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$", min_length=5, max_length=150)
    user_id: str = Field(min_length=3, max_length=100)
    password: str = Field(min_length=6)

    model_config = ConfigDict(extra="forbid")


class AdminSessionResponse(BaseModel):
    message: str
    access_token: str
    token_type: str
    admin: dict[str, object]

    model_config = ConfigDict(from_attributes=True)


class AdminPasswordUpdate(BaseModel):
    current_password: str = Field(min_length=6)
    new_password: str = Field(min_length=6)

    model_config = ConfigDict(extra="forbid")


class AdminReplaceRequest(BaseModel):
    mail_id: str = Field(pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$", min_length=5, max_length=150)
    user_id: str = Field(min_length=3, max_length=100)
    password: str = Field(min_length=6)

    model_config = ConfigDict(extra="forbid")


class AdminDeleteUserRequest(BaseModel):
    reason: Optional[str] = Field(default=None, min_length=5, max_length=250)

    model_config = ConfigDict(extra="forbid")


class AdminComplaintAssignRequest(BaseModel):
    department: str = Field(min_length=2, max_length=100)

    model_config = ConfigDict(extra="forbid")


class AdminOfficerView(BaseModel):
    full_name: str
    username: str
    email: str
    department: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AdminDepartmentBase(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    description: Optional[str] = Field(default=None, max_length=300)
    state: Optional[str] = Field(default=None, min_length=2, max_length=100)
    city: Optional[str] = Field(default=None, min_length=2, max_length=100)


class AdminDepartmentCreate(AdminDepartmentBase):
    model_config = ConfigDict(extra="forbid")


class AdminDepartmentUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=2, max_length=100)
    description: Optional[str] = Field(default=None, max_length=300)
    state: Optional[str] = Field(default=None, min_length=2, max_length=100)
    city: Optional[str] = Field(default=None, min_length=2, max_length=100)

    model_config = ConfigDict(extra="forbid")


class AdminDepartmentResponse(AdminDepartmentBase):
    id: str
    complaint_count: int = 0
    officer_count: int = 0
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
