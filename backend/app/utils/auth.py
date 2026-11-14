from fastapi import Depends, HTTPException
import jwt
from jwt import InvalidTokenError
from fastapi import Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timedelta
from uuid import UUID

from app.config import settings
from app.database import get_db
from app.models.user import User

def create_jwt_token(data: dict) -> str:
    """Create a JWT token with expiration."""
    if len(settings.JWT_SECRET) < 32:
        raise RuntimeError("JWT_SECRET must be configured with at least 32 characters")
    payload = data.copy()
    payload["exp"] = datetime.utcnow() + timedelta(minutes=settings.JWT_EXPIRE_MINUTES)
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


async def get_current_user(
    request: Request,
    db: AsyncSession = Depends(get_db)
) -> User:
    """Decode JWT and return current authenticated user."""
    try:
        token = request.cookies.get(settings.AUTH_COOKIE_NAME)
        if not token:
            authorization = request.headers.get("Authorization", "")
            if authorization.lower().startswith("bearer "):
                token = authorization[7:].strip()
        if not token:
            raise HTTPException(status_code=401, detail="Authentication required")
        payload = jwt.decode(
            token,
            settings.JWT_SECRET,
            algorithms=[settings.JWT_ALGORITHM]
        )
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        user_id = UUID(user_id)
    except (InvalidTokenError, ValueError, TypeError):
        raise HTTPException(status_code=401, detail="Invalid token")

    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user
