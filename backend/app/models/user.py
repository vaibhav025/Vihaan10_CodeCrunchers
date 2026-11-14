from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, Enum, JSON, Text
from sqlalchemy import Uuid
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
import enum
from app.database import Base
from app.models.encrypted import EncryptedInteger, EncryptedString


class AvatarState(str, enum.Enum):
    THRIVING = "thriving"
    STABLE = "stable"
    STRUGGLING = "struggling"
    CRITICAL = "critical"
    ZERO = "zero"


class LanguagePreference(str, enum.Enum):
    EN = "en"
    HI = "hi"
    TA = "ta"
    TE = "te"
    BN = "bn"
    MR = "mr"


class User(Base):
    __tablename__ = "users"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(EncryptedString("name"), nullable=False)
    email = Column(EncryptedString("email"), unique=True, nullable=False)
    email_lookup = Column(String(64), nullable=True)
    password_hash = Column(String(255), nullable=False)
    phone = Column(EncryptedString("phone"), nullable=True)
    age = Column(EncryptedInteger("age"), nullable=False)
    income_range = Column(EncryptedString("income_range"), nullable=True)  # "20000-30000"
    risk_profile = Column(EncryptedString("risk_profile"), default="moderate")
    retirement_age = Column(EncryptedInteger("retirement_age"), default=60)
    language = Column(Enum(LanguagePreference), default=LanguagePreference.EN)
    avatar_state = Column(Enum(AvatarState), default=AvatarState.ZERO)
    total_xp = Column(Integer, default=0)
    level = Column(Integer, default=1)
    is_nps_enrolled = Column(Boolean, default=False)
    # Kept nullable for compatibility with older Firebase based deployments.
    firebase_uid = Column(String(128), unique=True, nullable=True)
    fcm_token = Column(EncryptedString("fcm_token"), nullable=True)
    financial_data = Column(Text, nullable=False, default="{}")
    public_handle = Column(String(32), unique=True, nullable=True)
    show_on_leaderboard = Column(Boolean, default=False, nullable=False)
    ai_consent = Column(Boolean, default=False, nullable=False)
    consent_at = Column(DateTime(timezone=True), nullable=True)
    notification_settings = Column(JSON, nullable=False, default=dict)
    city = Column(EncryptedString("city"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    contributions = relationship("Contribution", back_populates="user")
    quest_progress = relationship("QuestProgress", back_populates="user")
    badges = relationship("UserBadge", back_populates="user")
    streaks = relationship("Streak", back_populates="user", uselist=False)
