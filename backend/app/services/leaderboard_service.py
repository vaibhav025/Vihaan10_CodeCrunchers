from redis.exceptions import RedisError
from app.redis_client import redis_client
from app.database import AsyncSessionLocal
from app.models.user import User
from app.models.streak import Streak
from app.models.contribution import Contribution
from sqlalchemy import select, func

async def remove_user_leaderboard(user_id: str, city: str | None = None):
    """Best-effort removal of entries written by earlier Redis-backed versions."""
    try:
        await redis_client.zrem("lb:national:xp", user_id)
        await redis_client.zrem("lb:streak:all", user_id)
        await redis_client.zrem("lb:contribution:all", user_id)
        if city:
            await redis_client.zrem(f"lb:city:{city}:xp", user_id)
        await redis_client.delete(f"lb:friends:{user_id}:xp", f"user:{user_id}:profile")
    except RedisError:
        return


async def get_leaderboard(board_type: str, city: str = None, limit: int = 50) -> list:
    """Get top users from a leaderboard."""
    return await _database_leaderboard(board_type, city, limit)


async def _database_leaderboard(board_type: str, city: str | None, limit: int) -> list:
    async with AsyncSessionLocal() as db:
        users = (await db.execute(select(User).where(User.show_on_leaderboard.is_(True)))).scalars().all()
        rows = []
        for user in users:
            if board_type == "city" and city and user.city != city:
                continue
            score = user.total_xp or 0
            if board_type == "streak":
                streak = await db.execute(select(Streak.current_streak).where(Streak.user_id == user.id))
                score = streak.scalar_one_or_none() or 0
            elif board_type == "contribution":
                amounts = await db.execute(select(Contribution.amount).where(Contribution.user_id == user.id))
                score = sum(amounts.scalars().all())
            rows.append((user, score))
        rows.sort(key=lambda row: row[1], reverse=True)
        return [{"rank": i, "name": user.public_handle or "Anonymous", "level": user.level or 1, "xp": score}
                for i, (user, score) in enumerate(rows[:limit], start=1)]


async def get_user_rank(user_id: str, board_type: str = "national", city: str | None = None) -> dict:
    """Get user's rank in a leaderboard."""
    try:
        from uuid import UUID
        return await _database_user_rank(UUID(user_id), board_type, city)
    except (ValueError, TypeError):
        return {"rank": None, "xp": 0, "total_users": 0, "percentile": 0}


async def _database_user_rank(user_id, board_type: str, city: str | None = None) -> dict:
    async with AsyncSessionLocal() as db:
        users = (await db.execute(select(User).where(User.show_on_leaderboard.is_(True)))).scalars().all()
        scores = []
        own_score = None
        for user in users:
            if board_type == "city" and city and user.city != city:
                continue
            score = user.total_xp or 0
            if board_type == "streak":
                row = await db.execute(select(Streak.current_streak).where(Streak.user_id == user.id))
                score = row.scalar_one_or_none() or 0
            elif board_type == "contribution":
                row = await db.execute(select(Contribution.amount).where(Contribution.user_id == user.id))
                score = sum(row.scalars().all())
            scores.append(score)
            if user.id == user_id:
                own_score = score
        if own_score is None:
            return {"rank": None, "xp": 0, "total_users": len(users), "percentile": 0}
        higher = sum(score > own_score for score in scores)
        return {"rank": higher + 1, "xp": int(own_score), "total_users": len(users),
                "percentile": round((1 - higher / max(len(users), 1)) * 100, 1)}
