from typing import Any
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User
from app.utils.auth import get_current_user
from app.utils.encryption import EncryptionConfigurationError, decrypt_data, encrypt_data

router = APIRouter()


class FinancialData(BaseModel):
    assets: list[dict[str, Any]] = Field(default_factory=list, max_length=100)
    income: float = Field(default=0, ge=0, le=1_000_000_000)
    expenses: float = Field(default=0, ge=0, le=1_000_000_000)
    emi: float = Field(default=0, ge=0, le=1_000_000_000)
    loans: float = Field(default=0, ge=0, le=1_000_000_000_000)
    tax: float = Field(default=0, ge=0, le=1_000_000_000)
    health: bool = False
    term: bool = False
    unlocked: list[str] = Field(default_factory=list, max_length=500)
    costs: list[dict[str, Any]] = Field(default_factory=list, max_length=100)
    inflation: float = Field(default=6, ge=0, le=30)
    retireSpend: float = Field(default=80, ge=0, le=200)


@router.get("", response_model=FinancialData)
async def get_financial_data(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        data = decrypt_data(current_user.financial_data or {})
        # Upgrade records created before app-level encryption was enabled.
        if isinstance(current_user.financial_data, dict):
            current_user.financial_data = encrypt_data(data)
            await db.commit()
        return data
    except EncryptionConfigurationError as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    except (ValueError, TypeError):
        raise HTTPException(status_code=500, detail="Stored financial data could not be decrypted")


@router.put("", response_model=FinancialData)
async def save_financial_data(
    data: FinancialData,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        current_user.financial_data = encrypt_data(data.model_dump())
    except EncryptionConfigurationError as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    await db.commit()
    return data.model_dump()
