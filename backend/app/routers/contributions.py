from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

from app.database import get_db
from app.models.user import User
from app.models.contribution import Contribution, ContributionXPGrant
from sqlalchemy.exc import IntegrityError
from app.services.avatar_service import calculate_avatar_state, get_recommended_contribution
from app.services.xp_service import award_xp, XPAction
from app.services.badge_service import check_and_award_badges
from app.utils.auth import get_current_user

router = APIRouter()


class ContributionCreate(BaseModel):
    amount: float = Field(..., gt=0)
    source: str = Field(default="manual")
    financial_year: Optional[str] = None


@router.post("/add")
async def add_contribution(
    data: ContributionCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Log a new NPS contribution and update avatar state."""
    # Determine financial year
    now = datetime.utcnow()
    fy = data.financial_year or (
        f"{now.year}-{str(now.year + 1)[-2:]}" if now.month >= 4
        else f"{now.year - 1}-{str(now.year)[-2:]}"
    )

    # Read the existing totals before adding the new row, so it is not counted twice
    count_result = await db.execute(
        select(func.count(Contribution.id))
        .where(Contribution.user_id == current_user.id)
    )
    prior_count = count_result.scalar() or 0
    amounts_result = await db.execute(
        select(Contribution.amount).where(Contribution.user_id == current_user.id)
    )
    prior_total = sum(amounts_result.scalars().all())

    month_count = await db.execute(select(func.count(ContributionXPGrant.id)).where(
        ContributionXPGrant.user_id == current_user.id,
        ContributionXPGrant.year == now.year, ContributionXPGrant.month == now.month))
    xp_eligible = (month_count.scalar() or 0) == 0
    contribution = Contribution(
        user_id=current_user.id,
        amount=data.amount,
        source=data.source,
        financial_year=fy
    )
    db.add(contribution)

    if xp_eligible:
        try:
            async with db.begin_nested():
                db.add(ContributionXPGrant(user_id=current_user.id, year=now.year, month=now.month))
                await db.flush()
        except IntegrityError:
            xp_eligible = False

    if prior_count == 0 and xp_eligible:
        await award_xp(db, current_user, 500, XPAction.FIRST_CONTRIBUTION)
    elif xp_eligible:
        await award_xp(db, current_user, 100, XPAction.MONTHLY_CONTRIBUTION)

    # Update avatar state
    total = prior_total + data.amount
    monthly_avg = total / (prior_count + 1)
    recommended = get_recommended_contribution(current_user.income_range or "20000-30000")
    new_state = calculate_avatar_state(monthly_avg, recommended)
    current_user.avatar_state = new_state

    # Contribution badges (Saver 5K, Five Figure) are checked here as well as on quests
    await db.flush()
    await check_and_award_badges(db, current_user)

    await db.commit()

    return {
        "message": "Contribution logged",
        "amount": data.amount,
        "financial_year": fy,
        "avatar_state": new_state.value,
        "total_contributed": total,
        "xp_eligible": xp_eligible,
    }


@router.get("/history")
async def get_contribution_history(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get user's contribution history."""
    result = await db.execute(
        select(Contribution)
        .where(Contribution.user_id == current_user.id)
        .order_by(Contribution.contributed_at.desc())
    )
    contributions = result.scalars().all()

    total = sum(c.amount for c in contributions)

    return {
        "contributions": [
            {
                "id": str(c.id),
                "amount": c.amount,
                "source": c.source,
                "financial_year": c.financial_year,
                "contributed_at": c.contributed_at.isoformat() if c.contributed_at else None,
            }
            for c in contributions
        ],
        "total": total,
        "count": len(contributions),
    }
