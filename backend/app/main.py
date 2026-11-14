from fastapi import FastAPI
from contextlib import asynccontextmanager
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.routers import auth, users, quests, gamification, simulator, ai_coach, contributions, notifications, tracker, lab
from app.database import engine, Base
from app.models import user, contribution, quest, streak, badge, lab as lab_models  # Register all ORM tables.
from app.config import settings
from app.limiter import limiter
from app.utils.encryption import validate_key

@asynccontextmanager
async def lifespan(app):
    await initialize_database()
    yield
    await engine.dispose()

app = FastAPI(
    title="SixtyFy API",
    description="Backend API for SixtyFy — Gamified NPS Platform",
    version="1.0.0",
    lifespan=lifespan,
)

# Rate limiting
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS
ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:5173",
    "http://localhost:4173",
    "http://127.0.0.1:4173",
    "http://127.0.0.1:5173",
    "http://localhost:8081",
    "https://pensionquest.in",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(users.router, prefix="/api/user", tags=["Users"])
app.include_router(quests.router, prefix="/api/quests", tags=["Quests"])
app.include_router(gamification.router, prefix="/api/gamification", tags=["Gamification"])
app.include_router(simulator.router, prefix="/api/simulator", tags=["Simulator"])
app.include_router(ai_coach.router, prefix="/api/ai", tags=["AI Coach"])
app.include_router(contributions.router, prefix="/api/contributions", tags=["Contributions"])
app.include_router(notifications.router, prefix="/api/notifications", tags=["Notifications"])
app.include_router(tracker.router, prefix="/api/tracker", tags=["Financial Tracker"])
app.include_router(lab.router, prefix="/api/lab", tags=["Market Lab"])


async def initialize_database():
    if len(settings.JWT_SECRET) < 32:
        raise RuntimeError("Set JWT_SECRET to a random value with at least 32 characters before starting the API")
    if not settings.DATA_ENCRYPTION_KEY:
        raise RuntimeError("Set DATA_ENCRYPTION_KEY before starting the API")
    validate_key()
    # Create any missing tables (the README promises this; without it a fresh database has none).
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)



@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "SixtyFy API"}


@app.get("/health/ready")
async def readiness_check():
    from app.redis_client import redis_client
    try:
        async with engine.connect() as connection:
            await connection.execute(text("SELECT 1"))
        await redis_client.ping()
    except Exception as exc:
        return JSONResponse({"status": "not_ready", "detail": type(exc).__name__}, status_code=503)
    return {"status": "ready", "database": "ok", "redis": "ok"}


@app.middleware("http")
async def security_headers(request, call_next):
    origin = request.headers.get("origin")
    if request.method in {"POST", "PUT", "PATCH", "DELETE"} and origin and origin not in ALLOWED_ORIGINS:
        return JSONResponse({"detail": "Origin is not allowed"}, status_code=403)
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    if settings.APP_ENV.lower() == "production":
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response
