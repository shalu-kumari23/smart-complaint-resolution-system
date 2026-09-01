from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, model_validator

EmailValue = Annotated[str, Field(pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$")]
UsernameValue = Annotated[str, Field(pattern=r"^[a-zA-Z0-9_.]{3,30}$")]
PinCodeValue = Annotated[str, Field(pattern=r"^\d{6}$")]


class AddressSchema(BaseModel):
    pin_code: PinCodeValue
    county: str = Field(min_length=2, max_length=100)
    state: str = Field(min_length=2, max_length=100)
    city: str = Field(min_length=2, max_length=100)

    model_config = ConfigDict(extra="forbid")


# -------------------------
# CREATE USER
# -------------------------
class UserCreate(BaseModel):
    full_name: str = Field(min_length=2, max_length=120)
    username: UsernameValue
    email: EmailValue
    password: str = Field(min_length=6)
    age: int = Field(ge=1, le=120)
    guardian_consent: bool = False
    address: AddressSchema

    model_config = ConfigDict(from_attributes=True, extra="forbid")

    @model_validator(mode="after")
    def validate_guardian_consent(self):
        if self.age < 18 and not self.guardian_consent:
            raise ValueError("Users below 18 need guardian consent to apply for grievances.")
        return self


class UserLogin(BaseModel):
    identifier: str = Field(min_length=3, max_length=100)
    password: str = Field(min_length=6)

    model_config = ConfigDict(extra="forbid")


# -------------------------
# USER RESPONSE
# -------------------------
class UserResponse(BaseModel):
    id: str
    full_name: str
    username: str
    email: EmailValue
    age: int
    guardian_consent: bool
    address: AddressSchema
    role: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class UserSessionResponse(BaseModel):
    message: str
    access_token: str
    token_type: str
    user: UserResponse

    model_config = ConfigDict(from_attributes=True)
