from fastapi import APIRouter, Depends, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.limiter import limiter
from app.ml.multilingual_handler import SUPPORTED_LANGUAGES
from app.models.contribution import Contribution
from app.models.streak import Streak
from app.models.user import User
from app.schemas.ai_coach import ChatRequest, ChatResponse
from app.services.assistant import answer
from app.services.ai_service import providers
from app.config import settings
from app.utils.auth import get_current_user
from app.utils.encryption import decrypt_data

router = APIRouter()

DISCLAIMERS = {
    "en": "This is an estimate for learning, not financial advice.",
    "hi": "यह एक अनुमान है, वित्तीय सलाह नहीं।",
    "ta": "இது ஒரு மதிப்பீடு மட்டுமே; நிதி ஆலோசனை அல்ல.",
    "te": "ఇది అంచనా మాత్రమే; ఆర్థిక సలహా కాదు.",
    "bn": "এটি একটি অনুমান, আর্থিক পরামর্শ নয়।",
    "mr": "हा अंदाज आहे, आर्थिक सल्ला नाही.",
}


@router.post("/coach/chat", response_model=ChatResponse)
@limiter.limit("30/minute")
async def chat_with_coach(
    request: Request,
    body: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """One assistant for the user's own numbers, what-if sums, suggestions and general finance.

    All figures are computed on this server. An outside model is used only with the user's
    consent, and even then it receives placeholders instead of values (see services/assistant.py).
    """
    try:
        money = decrypt_data(current_user.financial_data or {})
    except (ValueError, TypeError):
        money = {}
    amounts = (await db.execute(select(Contribution.amount).where(Contribution.user_id == current_user.id))).scalars().all()
    streak = (await db.execute(select(Streak.current_streak).where(Streak.user_id == current_user.id))).scalar_one_or_none()
    lang = current_user.language.value if current_user.language else "en"

    result = await answer(
        body.message,
        [{"role": m.role, "content": m.content} for m in body.conversation_history],
        profile={"age": current_user.age, "retirement_age": current_user.retirement_age, "risk_profile": current_user.risk_profile},
        money=money,
        extras={"contributed": sum(amounts), "xp": current_user.total_xp, "level": current_user.level, "streak": streak or 0},
        language=SUPPORTED_LANGUAGES.get(lang, "English"),
        allow_ai=bool(current_user.ai_consent),
    )
    return ChatResponse(disclaimer=DISCLAIMERS.get(lang, DISCLAIMERS["en"]), **result)


@router.get("/status")
async def ai_status(current_user: User = Depends(get_current_user)):
    """Which AI route is active, so the app (and a demo) can show whether Prune is screening requests."""
    routes = [name for name, *_ in providers()]
    return {
        "gateway": "prune" if routes[:1] == ["prune"] else None,
        "strict": bool(settings.PRUNE_API_KEY and settings.PRUNE_STRICT),
        "routes": routes,
        "ai_consent": bool(current_user.ai_consent),
    }
