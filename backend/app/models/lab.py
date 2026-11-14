from sqlalchemy import Column, Date, DateTime, ForeignKey, Integer, JSON, String, UniqueConstraint
from sqlalchemy import Uuid
from sqlalchemy.sql import func
import uuid
from app.database import Base


class LabProgress(Base):
    """Market Lab progress for one user and module.

    Holds scores and lesson ids only. No rupee amounts are stored here: the simulation
    runs in the browser on virtual money and the user's real figures never reach this table.
    """
    __tablename__ = "lab_progress"
    __table_args__ = (UniqueConstraint("user_id", "module", name="uq_lab_progress_user_module"),)

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(Uuid(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    module = Column(String(20), nullable=False)
    best_score = Column(Integer, nullable=False, default=0)
    runs_completed = Column(Integer, nullable=False, default=0)
    last_outcome = Column(String(32), nullable=True)
    last_lessons = Column(JSON, nullable=False, default=list)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class LabXPGrant(Base):
    """XP given for Lab activity on one day, so the daily cap can be enforced."""
    __tablename__ = "lab_xp_grants"
    __table_args__ = (UniqueConstraint("user_id", "day", name="uq_lab_xp_user_day"),)

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(Uuid(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    day = Column(Date, nullable=False)
    xp = Column(Integer, nullable=False, default=0)
