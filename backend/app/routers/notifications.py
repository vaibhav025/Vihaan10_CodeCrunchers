from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from typing import Optional

from app.models.user import User
from app.utils.auth import get_current_user
from app.database import get_db

router = APIRouter()


class NotificationSettings(BaseModel):
    daily_quest: bool = True
    streak_reminder: bool = True
    contribution_nudge: bool = True
    badge_unlocked: bool = True

class TokenBody(BaseModel):
    fcm_token: str = Field(min_length=10, max_length=4096)


@router.post("/register-token")
async def register_fcm_token(
    data: TokenBody,
    db = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Register FCM token for push notifications."""
    current_user.fcm_token = data.fcm_token
    await db.commit()
    return {"message": "FCM token registered", "user_id": str(current_user.id)}


@router.get("/settings")
async def get_notification_settings(
    current_user: User = Depends(get_current_user),
):
    """Get notification preferences."""
    return NotificationSettings(**(current_user.notification_settings or {}))


@router.put("/settings")
async def update_notification_settings(
    settings: NotificationSettings,
    db = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update notification preferences."""
    current_user.notification_settings = settings.model_dump()
    await db.commit()
    return {"message": "Notification settings updated"}
