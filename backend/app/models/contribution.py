from sqlalchemy import Column, String, DateTime, ForeignKey, Integer, UniqueConstraint
from sqlalchemy import Uuid
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
from app.database import Base
from app.models.encrypted import EncryptedFloat


class Contribution(Base):
    __tablename__ = "contributions"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(Uuid(as_uuid=True), ForeignKey("users.id"), nullable=False)
    amount = Column(EncryptedFloat(), nullable=False)
    source = Column(String(50), default="manual")   # "manual", "employer", "auto"
    contributed_at = Column(DateTime(timezone=True), server_default=func.now())
    financial_year = Column(String(10))              # "2025-26"

    user = relationship("User", back_populates="contributions")


class ContributionXPGrant(Base):
    __tablename__ = "contribution_xp_grants"
    __table_args__ = (UniqueConstraint("user_id", "year", "month", name="uq_contribution_xp_user_month"),)
    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(Uuid(as_uuid=True), ForeignKey("users.id"), nullable=False)
    year = Column(Integer, nullable=False)
    month = Column(Integer, nullable=False)
