from datetime import date
from typing import Literal

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.limiter import limiter
from app.models.lab import LabProgress, LabXPGrant
from app.models.user import User
from app.services.xp_service import XPAction, award_xp
from app.utils.auth import get_current_user

router = APIRouter()

Module = Literal["stocks", "retire", "funds", "schemes"]

# XP for one saved result, by module: a base for finishing plus a share of the score.
# Scores reward good behaviour (right predictions, holding through a dip, a funded
# retirement), never the number of trades.
XP_RULES: dict[str, tuple[int, float]] = {
    "stocks": (0, 0.3),
    "retire": (40, 0.6),
    "funds": (10, 0.4),
    "schemes": (10, 0.4),
}
# The most Lab XP one user can earn in a day, so replaying cannot farm XP.
LAB_DAILY_XP_CAP = 150


class LabResult(BaseModel):
    """One finished activity. Carries a score and ids only, never money values."""
    model_config = ConfigDict(extra="forbid")

    module: Module
    score: int = Field(ge=0, le=100)
    outcome: str = Field(min_length=1, max_length=32, pattern=r"^[a-z0-9_]+$")
    lessons: list[str] = Field(default_factory=list, max_length=8)

    def clean_lessons(self) -> list[str]:
        return [x for x in self.lessons if x.replace("_", "").isalnum() and x.islower() and len(x) <= 32]


def _row(p: LabProgress) -> dict:
    return {
        "module": p.module,
        "best_score": p.best_score,
        "runs_completed": p.runs_completed,
        "last_outcome": p.last_outcome,
        "last_lessons": p.last_lessons or [],
        "updated_at": p.updated_at.isoformat() if p.updated_at else None,
    }


@router.get("/progress")
@limiter.limit("60/minute")
async def get_progress(request: Request, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """The signed-in user's Market Lab progress, one entry per module played."""
    rows = (await db.execute(select(LabProgress).where(LabProgress.user_id == current_user.id))).scalars().all()
    return {"progress": [_row(p) for p in rows], "daily_xp_cap": LAB_DAILY_XP_CAP}


@router.post("/progress")
@limiter.limit("30/minute")
async def save_progress(request: Request, result: LabResult, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Record a finished activity and award XP, up to the daily cap."""
    row = (await db.execute(
        select(LabProgress).where(LabProgress.user_id == current_user.id, LabProgress.module == result.module)
    )).scalar_one_or_none()
    if row is None:
        row = LabProgress(user_id=current_user.id, module=result.module, best_score=0, runs_completed=0, last_lessons=[])
        db.add(row)
    row.best_score = max(row.best_score or 0, result.score)
    row.runs_completed = (row.runs_completed or 0) + 1
    row.last_outcome = result.outcome
    row.last_lessons = result.clean_lessons()

    today = date.today()
    grant = (await db.execute(
        select(LabXPGrant).where(LabXPGrant.user_id == current_user.id, LabXPGrant.day == today)
    )).scalar_one_or_none()
    if grant is None:
        grant = LabXPGrant(user_id=current_user.id, day=today, xp=0)
        db.add(grant)
    base, per_point = XP_RULES[result.module]
    wanted = base + round(result.score * per_point)
    earned = max(0, min(wanted, LAB_DAILY_XP_CAP - (grant.xp or 0)))
    grant.xp = (grant.xp or 0) + earned

    xp = {"xp_earned": 0, "total_xp": current_user.total_xp, "level": current_user.level, "level_up": False}
    if earned:
        xp = await award_xp(db, current_user, earned, XPAction.LAB_SESSION)
    await db.commit()
    await db.refresh(row)
    return {
        "progress": _row(row),
        "xp_earned": xp["xp_earned"],
        "total_xp": xp["total_xp"],
        "level": xp["level"],
        "level_up": xp["level_up"],
        "xp_capped": earned < wanted,
        "daily_xp_left": LAB_DAILY_XP_CAP - grant.xp,
    }
