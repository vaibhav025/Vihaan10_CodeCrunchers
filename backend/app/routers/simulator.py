from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from typing import Optional, List

from app.models.user import User
from app.services.simulator_service import run_simulation, run_comparison
from app.utils.auth import get_current_user
from app.config import settings

router = APIRouter()


class SimulationRequest(BaseModel):
    current_age: Optional[int] = None
    retirement_age: int = Field(default=60, ge=50, le=75)
    monthly_contribution: float = Field(..., ge=0, le=200000)
    annual_return_pct: float = Field(default=10.0, ge=0, le=30)
    risk_profile: str = Field(default="moderate", pattern="^(conservative|moderate|aggressive)$")
    annual_income: float = Field(default=0, ge=0)
    employer_contribution_monthly: float = Field(default=0, ge=0, le=200000)
    tax_regime: str = Field(default="new", pattern="^(old|new)$")
    inflation_pct: float = Field(default=6, ge=0, le=20)


class ComparisonRequest(BaseModel):
    retirement_age: int = Field(default=60, ge=50, le=75)
    contributions: List[float] = Field(..., min_length=2, max_length=5)
    annual_return_pct: float = Field(default=10.0, ge=0, le=30)
    annual_income: float = Field(default=0, ge=0)
    employer_contribution_monthly: float = Field(default=0, ge=0, le=200000)
    tax_regime: str = Field(default="new", pattern="^(old|new)$")
    risk_profile: str = Field(default="moderate", pattern="^(conservative|moderate|aggressive)$")


@router.post("/calculate")
async def calculate(
    params: SimulationRequest,
    current_user: User = Depends(get_current_user),
):
    """Calculate projected NPS corpus based on contribution parameters."""
    age = params.current_age or current_user.age

    result = await run_simulation(
        current_age=age,
        retirement_age=params.retirement_age,
        monthly_contribution=params.monthly_contribution,
        annual_return_pct=params.annual_return_pct,
        risk_profile=params.risk_profile,
        annual_income=params.annual_income,
        tax_regime=params.tax_regime,
        employer_contribution_monthly=params.employer_contribution_monthly,
        inflation_pct=params.inflation_pct, annuity_share=settings.NPS_ANNUITY_SHARE
    )

    return {**result, "annuity_share": settings.NPS_ANNUITY_SHARE, "lump_sum_share": 1 - settings.NPS_ANNUITY_SHARE,
            "note": "Illustrative projections only, not guarantees or financial advice. Exit options depend on current PFRDA rules and corpus thresholds."}


@router.post("/compare")
async def compare_scenarios(
    params: ComparisonRequest,
    current_user: User = Depends(get_current_user),
):
    """Compare multiple contribution scenarios side by side."""
    results = await run_comparison(
        current_age=current_user.age,
        retirement_age=params.retirement_age,
        contributions=params.contributions,
        annual_return_pct=params.annual_return_pct,
        annual_income=params.annual_income,
        tax_regime=params.tax_regime,
        employer_contribution_monthly=params.employer_contribution_monthly,
        risk_profile=params.risk_profile
    )

    return {"scenarios": results}
