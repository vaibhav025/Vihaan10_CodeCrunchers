"""Create/update the app schema and add user-facing hardening fields.

Revision ID: 20261113_01
Revises:
"""
from alembic import op
from sqlalchemy import inspect, text
from app.database import Base
from app.models import user, contribution, quest, streak, badge

revision = "20261113_01"
down_revision = None
branch_labels = None
depends_on = None

def upgrade():
    bind = op.get_bind()
    # create_all creates missing tables without mutating existing table layouts.
    Base.metadata.create_all(bind=bind)
    inspector = inspect(bind)
    if "users" not in inspector.get_table_names():
        return
    columns = {c["name"] for c in inspector.get_columns("users")}
    additions = {
        "password_hash": "VARCHAR(255)", "financial_data": "TEXT NOT NULL DEFAULT '{}'",
        "email_lookup": "VARCHAR(64)", "public_handle": "VARCHAR(32)",
        "show_on_leaderboard": "BOOLEAN NOT NULL DEFAULT FALSE",
        "ai_consent": "BOOLEAN NOT NULL DEFAULT FALSE", "consent_at": "TIMESTAMP NULL",
        "notification_settings": "JSON NOT NULL DEFAULT '{}'",
    }
    for name, type_sql in additions.items():
        if name not in columns:
            op.execute(text(f"ALTER TABLE users ADD COLUMN {name} {type_sql}"))
    if bind.dialect.name == "postgresql":
        for name in ("name", "email", "phone", "age", "income_range", "risk_profile", "retirement_age", "fcm_token", "city", "financial_data"):
            op.execute(text(f"ALTER TABLE users ALTER COLUMN {name} TYPE TEXT USING {name}::text"))
        if "contributions" in inspector.get_table_names():
            op.execute(text("ALTER TABLE contributions ALTER COLUMN amount TYPE TEXT USING amount::text"))
    op.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS ix_users_email_lookup ON users(email_lookup)"))
    op.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS ix_users_public_handle ON users(public_handle)"))
    if "quest_progress" in inspector.get_table_names():
        op.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS uq_quest_progress_user_quest ON quest_progress(user_id, quest_id)"))

def downgrade():
    # Intentionally irreversible: downgrade must not drop or expose encrypted user data.
    pass
