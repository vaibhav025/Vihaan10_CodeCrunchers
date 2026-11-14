from pydantic import BaseModel, Field, field_validator
from typing import Optional, Any
from uuid import UUID
from datetime import datetime


def clean_phone(value: Optional[str]) -> Optional[str]:
    if not value:
        return None
    digits = "".join(c for c in value if c.isdigit())
    if digits.startswith("91") and len(digits) == 12:
        digits = digits[2:]
    if len(digits) != 10 or digits[0] not in "6789":
        raise ValueError("Enter a 10-digit Indian mobile number")
    return digits


class UserCreate(BaseModel):
    email: str = Field(..., min_length=5, max_length=255)
    password: str = Field(..., min_length=8, max_length=128)
    name: str = Field(..., min_length=1, max_length=100)
    age: int = Field(..., ge=18, le=100)
    income_range: Optional[str] = None
    phone: Optional[str] = Field(default=None, max_length=20)
    language: str = Field(default="en", pattern="^(en|hi|ta|te|bn|mr)$")
    retirement_age: int = Field(default=60, ge=50, le=75)
    risk_profile: str = Field(default="moderate", pattern="^(conservative|moderate|aggressive)$")
    financial_data: dict[str, Any] = Field(default_factory=dict)
    consent: bool = Field(..., description="Required consent to process account and financial data")

    @field_validator("phone")
    @classmethod
    def normalize_phone(cls, value: Optional[str]) -> Optional[str]:
        return clean_phone(value)

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        value = value.strip().lower()
        if value.count("@") != 1 or "." not in value.rsplit("@", 1)[-1]:
            raise ValueError("Enter a valid email address")
        return value


class LoginRequest(BaseModel):
    email: str = Field(..., min_length=5, max_length=255)
    password: str = Field(..., min_length=1, max_length=128)

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        return value.strip().lower()


class UserUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    age: Optional[int] = Field(default=None, ge=18, le=100)
    income_range: Optional[str] = None
    language: Optional[str] = Field(default=None, pattern="^(en|hi|ta|te|bn|mr)$")
    retirement_age: Optional[int] = Field(default=None, ge=50, le=75)
    risk_profile: Optional[str] = Field(default=None, pattern="^(conservative|moderate|aggressive)$")
    fcm_token: Optional[str] = None
    city: Optional[str] = None
    public_handle: Optional[str] = Field(default=None, min_length=3, max_length=32, pattern="^[A-Za-z0-9_]+$")
    show_on_leaderboard: Optional[bool] = None
    ai_consent: Optional[bool] = None
    phone: Optional[str] = Field(default=None, max_length=20)

    @field_validator("phone")
    @classmethod
    def normalize_phone(cls, value: Optional[str]) -> Optional[str]:
        return clean_phone(value)


class UserProfile(BaseModel):
    id: UUID
    name: str
    email: Optional[str] = None
    age: int
    income_range: Optional[str] = None
    risk_profile: str
    retirement_age: int
    language: str
    avatar_state: str
    total_xp: int
    level: int
    is_nps_enrolled: bool
    public_handle: Optional[str] = None
    show_on_leaderboard: bool = False
    ai_consent: bool = False
    phone: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class UserResponse(BaseModel):
    user: UserProfile
