from typing import Annotated

from pydantic import BaseModel, Field

EmailValue = Annotated[str, Field(pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$")]


# -------------------------
# LOGIN
# -------------------------
class UserLogin(BaseModel):
    email: EmailValue
    password: str

    model_config = {"extra": "forbid"}


# -------------------------
# TOKEN RESPONSE
# -------------------------
class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    user_id: str
    role: str
