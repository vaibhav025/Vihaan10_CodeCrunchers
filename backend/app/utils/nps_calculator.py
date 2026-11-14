from dataclasses import dataclass
from typing import Literal


@dataclass
class SimulationResult:
    projected_corpus: float
    corpus_in_today_rupees: float
    corpus_range: dict
    monthly_pension: float
    tax_saved_total: float
    years_to_retire: int
    cost_of_delay_1yr: float
    cost_of_delay_3yr: float
    cost_of_delay_5yr: float


def calculate_nps_corpus(
    current_age: int,
    retirement_age: int,
    monthly_contribution: float,
    annual_return_pct: float = 10.0,
    risk_profile: Literal["conservative", "moderate", "aggressive"] = "moderate",
    annual_income: float = 0,
    tax_regime: Literal["old", "new"] = "new",
    employer_contribution_monthly: float = 0,
    inflation_pct: float = 6.0,
    annuity_share: float = 0.20,
) -> SimulationResult:
    """
    Rule-based NPS corpus calculation per PFRDA methodology.
    Uses compound interest formula: FV = P * [((1+r)^n - 1) / r] * (1+r)
    """
    years = retirement_age - current_age
    if annual_return_pct == 10.0:
        annual_return_pct = {"conservative": 8.0, "moderate": 10.0, "aggressive": 12.0}[risk_profile]
    months = years * 12
    monthly_rate = annual_return_pct / 100 / 12

    # Future Value of monthly SIP
    if monthly_rate == 0:
        corpus = monthly_contribution * months
    else:
        corpus = monthly_contribution * (
            ((1 + monthly_rate) ** months - 1) / monthly_rate
        ) * (1 + monthly_rate)

    # Annuity calculation (40% of corpus goes to annuity at 6% annual)
    annuity_amount = corpus * annuity_share
    monthly_pension = (annuity_amount * 0.06) / 12

    # Tax savings (80CCD - simplified)
    annual_contribution = monthly_contribution * 12
    taxable_80ccd_1 = min(annual_contribution, annual_income * 0.10, 150000) if annual_income > 0 and tax_regime == "old" else 0
    taxable_80ccd_1b = min(max(annual_contribution - taxable_80ccd_1, 0), 50000) if tax_regime == "old" else 0
    taxable_80ccd_2 = min(employer_contribution_monthly * 12, annual_income * 0.14) if tax_regime == "new" and annual_income > 0 else 0
    tax_rate = 0.30 if annual_income > 1000000 else 0.20 if annual_income > 500000 else 0.05
    annual_tax_saving = (taxable_80ccd_1 + taxable_80ccd_1b + taxable_80ccd_2) * tax_rate
    total_tax_saved = annual_tax_saving * years

    # Cost of delay helper
    def corpus_at_years(y: int) -> float:
        m = y * 12
        if monthly_rate == 0:
            return monthly_contribution * m
        return monthly_contribution * (
            ((1 + monthly_rate) ** m - 1) / monthly_rate
        ) * (1 + monthly_rate)

    delay_1yr = corpus - corpus_at_years(max(years - 1, 0))
    delay_3yr = corpus - corpus_at_years(max(years - 3, 0))
    delay_5yr = corpus - corpus_at_years(max(years - 5, 0))

    return SimulationResult(
        projected_corpus=round(corpus, 2),
        corpus_in_today_rupees=round(corpus / ((1 + inflation_pct / 100) ** years), 2),
        corpus_range={str(rate): round(monthly_contribution * ((((1 + rate / 100 / 12) ** months - 1) / (rate / 100 / 12)) * (1 + rate / 100 / 12)) if rate else monthly_contribution * months, 2) for rate in (8, 10, 12)},
        monthly_pension=round(monthly_pension, 2),
        tax_saved_total=round(total_tax_saved, 2),
        years_to_retire=years,
        cost_of_delay_1yr=round(delay_1yr, 2),
        cost_of_delay_3yr=round(delay_3yr, 2),
        cost_of_delay_5yr=round(delay_5yr, 2)
    )
