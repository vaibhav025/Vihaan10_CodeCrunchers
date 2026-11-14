from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
import hashlib
import hmac
import secrets
from datetime import datetime, timezone

from app.database import get_db
from app.models.user import User, LanguagePreference
from app.models.streak import Streak
from app.schemas.user import UserCreate, LoginRequest, UserProfile, UserResponse
from app.config import settings
from app.utils.auth import create_jwt_token
from app.utils.encryption import EncryptionConfigurationError, email_fingerprint, encrypt_data
from app.limiter import limiter

router = APIRouter()


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    key = hashlib.scrypt(password.encode(), salt=salt, n=2**14, r=8, p=1)
    return f"scrypt${salt.hex()}${key.hex()}"


def verify_password(password: str, stored: str) -> bool:
    try:
        scheme, salt_hex, key_hex = stored.split("$", 2)
        if scheme != "scrypt":
            return False
        key = hashlib.scrypt(password.encode(), salt=bytes.fromhex(salt_hex), n=2**14, r=8, p=1)
        return hmac.compare_digest(key.hex(), key_hex)
    except (ValueError, TypeError):
        return False


def profile_for(user: User) -> UserProfile:
    return UserProfile(
        id=user.id, name=user.name, email=user.email, age=user.age,
        income_range=user.income_range, risk_profile=user.risk_profile,
        retirement_age=user.retirement_age,
        language=user.language.value if user.language else "en",
        avatar_state=user.avatar_state.value if user.avatar_state else "zero",
        total_xp=user.total_xp, level=user.level,
        is_nps_enrolled=user.is_nps_enrolled, created_at=user.created_at,
        public_handle=user.public_handle, show_on_leaderboard=user.show_on_leaderboard, ai_consent=user.ai_consent, phone=user.phone,
    )


def issue_session(response: Response, user_id: str) -> None:
    if len(settings.JWT_SECRET) < 32:
        raise HTTPException(status_code=503, detail="JWT_SECRET must be configured with at least 32 characters")
    response.set_cookie(
        key=settings.AUTH_COOKIE_NAME,
        value=create_jwt_token({"sub": user_id}),
        httponly=True,
        secure=settings.APP_ENV.lower() == "production",
        samesite="lax",
        max_age=settings.JWT_EXPIRE_MINUTES * 60,
        path="/",
    )


def require_auth_config() -> None:
    if len(settings.JWT_SECRET) < 32:
        raise HTTPException(status_code=503, detail="JWT_SECRET must be configured with at least 32 characters")


@router.post("/register", response_model=UserResponse, status_code=201)
@limiter.limit("10/hour")
async def register(request: Request, user_data: UserCreate, response: Response, db: AsyncSession = Depends(get_db)):
    require_auth_config()
    if not user_data.consent:
        raise HTTPException(status_code=422, detail="Consent is required to create an account")
    lookup = email_fingerprint(user_data.email)
    existing = await db.execute(select(User.id).where(User.email_lookup == lookup))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="An account with this email already exists")

    try:
        language = LanguagePreference(user_data.language)
    except ValueError:
        raise HTTPException(status_code=422, detail="Unsupported language")

    try:
        protected_financial_data = encrypt_data(user_data.financial_data)
    except EncryptionConfigurationError as exc:
        raise HTTPException(status_code=503, detail=str(exc))

    user = User(
        name=user_data.name.strip(), email=user_data.email, email_lookup=lookup,
        password_hash=hash_password(user_data.password), age=user_data.age,
        income_range=user_data.income_range, language=language, phone=user_data.phone,
        retirement_age=user_data.retirement_age, risk_profile=user_data.risk_profile,
        financial_data=protected_financial_data,
        consent_at=datetime.now(timezone.utc),
        # Keep older schemas with a NOT NULL Firebase column writable; this value is never used for auth.
        firebase_uid=f"legacy-unused-{secrets.token_urlsafe(18)}",
    )
    db.add(user)
    try:
        await db.flush()
        db.add(Streak(user_id=user.id))
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=409, detail="An account with this email already exists")
    await db.refresh(user)
    issue_session(response, str(user.id))
    return UserResponse(user=profile_for(user))


@router.post("/login", response_model=UserResponse)
@limiter.limit("5/minute")
async def login(request: Request, credentials: LoginRequest, response: Response, db: AsyncSession = Depends(get_db)):
    require_auth_config()
    result = await db.execute(select(User).where(User.email_lookup == email_fingerprint(credentials.email)))
    user = result.scalar_one_or_none()
    if not user or not verify_password(credentials.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Email or password is incorrect")
    issue_session(response, str(user.id))
    return UserResponse(user=profile_for(user))


@router.post("/logout", status_code=204)
async def logout(response: Response):
    response.delete_cookie(
        key=settings.AUTH_COOKIE_NAME,
        httponly=True,
        secure=settings.APP_ENV.lower() == "production",
        samesite="lax",
        path="/",
    )
    response.status_code = status.HTTP_204_NO_CONTENT
    return response
