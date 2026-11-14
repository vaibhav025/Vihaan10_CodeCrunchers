from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.user import User
from app.models.streak import Streak
from app.models.contribution import Contribution, ContributionXPGrant
from app.models.quest import QuestProgress
from app.models.badge import UserBadge
from app.models.lab import LabProgress, LabXPGrant
from app.utils.encryption import decrypt_data
from app.schemas.user import UserProfile, UserUpdate
from app.utils.auth import get_current_user

router = APIRouter()


@router.get("/profile", response_model=UserProfile)
async def get_profile(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get current user's profile."""
    # Load streak
    streak_result = await db.execute(
        select(Streak).where(Streak.user_id == current_user.id)
    )
    streak = streak_result.scalar_one_or_none()

    return UserProfile(
        id=current_user.id,
        name=current_user.name,
        email=current_user.email,
        age=current_user.age,
        income_range=current_user.income_range,
        risk_profile=current_user.risk_profile,
        retirement_age=current_user.retirement_age,
        language=current_user.language.value if current_user.language else "en",
        avatar_state=current_user.avatar_state.value if current_user.avatar_state else "zero",
        total_xp=current_user.total_xp,
        level=current_user.level,
        is_nps_enrolled=current_user.is_nps_enrolled,
        public_handle=current_user.public_handle,
        show_on_leaderboard=current_user.show_on_leaderboard,
        ai_consent=current_user.ai_consent,
        phone=current_user.phone,
        created_at=current_user.created_at,
    )


@router.put("/update")
async def update_profile(
    updates: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update current user's profile."""
    update_data = updates.model_dump(exclude_unset=True)
    if "language" in update_data:
        from app.models.user import LanguagePreference
        update_data["language"] = LanguagePreference(update_data["language"])

    for field, value in update_data.items():
        setattr(current_user, field, value)

    await db.commit()
    await db.refresh(current_user)

    return {"message": "Profile updated", "user_id": str(current_user.id)}


@router.get("/export")
async def export_user_data(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    contributions = (await db.execute(select(Contribution).where(Contribution.user_id == current_user.id))).scalars().all()
    progress = (await db.execute(select(QuestProgress).where(QuestProgress.user_id == current_user.id))).scalars().all()
    return {"profile": {"id": str(current_user.id), "name": current_user.name, "email": current_user.email,
        "age": current_user.age, "income_range": current_user.income_range, "risk_profile": current_user.risk_profile,
        "retirement_age": current_user.retirement_age, "language": current_user.language.value if current_user.language else "en",
        "public_handle": current_user.public_handle, "show_on_leaderboard": current_user.show_on_leaderboard,
        "ai_consent": current_user.ai_consent, "data_processing_consent": current_user.consent_at is not None,
        "consent_recorded_at": current_user.consent_at.isoformat() if current_user.consent_at else None},
        "financial_data": decrypt_data(current_user.financial_data),
        "contributions": [{"amount": c.amount, "source": c.source, "financial_year": c.financial_year,
                           "contributed_at": c.contributed_at.isoformat() if c.contributed_at else None} for c in contributions],
        "quest_progress": [{"quest_id": str(q.quest_id), "completed_at": q.completed_at.isoformat() if q.completed_at else None,
                            "xp_earned": q.xp_earned, "is_correct": q.is_correct} for q in progress]}


@router.delete("/me", status_code=204)
async def delete_my_account(response: Response, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    from app.services.leaderboard_service import remove_user_leaderboard
    await remove_user_leaderboard(str(current_user.id), current_user.city)
    await db.execute(UserBadge.__table__.delete().where(UserBadge.user_id == current_user.id))
    await db.execute(QuestProgress.__table__.delete().where(QuestProgress.user_id == current_user.id))
    await db.execute(Contribution.__table__.delete().where(Contribution.user_id == current_user.id))
    await db.execute(ContributionXPGrant.__table__.delete().where(ContributionXPGrant.user_id == current_user.id))
    await db.execute(Streak.__table__.delete().where(Streak.user_id == current_user.id))
    await db.execute(LabProgress.__table__.delete().where(LabProgress.user_id == current_user.id))
    await db.execute(LabXPGrant.__table__.delete().where(LabXPGrant.user_id == current_user.id))
    await db.delete(current_user)
    await db.commit()
    from app.config import settings
    response.delete_cookie(settings.AUTH_COOKIE_NAME, path="/", httponly=True, samesite="lax")
    response.status_code = 204
    return response
