"""Add Market Lab progress and daily XP tables.

Revision ID: 20261114_01
Revises: 20261113_01
"""
from alembic import op
import sqlalchemy as sa

revision = "20261114_01"
down_revision = "20261113_01"
branch_labels = None
depends_on = None


def upgrade():
    existing = set(sa.inspect(op.get_bind()).get_table_names())
    # The app also creates missing tables at startup, so either table may already exist.
    if "lab_progress" not in existing:
        op.create_table(
            "lab_progress",
            sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
            sa.Column("user_id", sa.Uuid(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
            sa.Column("module", sa.String(20), nullable=False),
            sa.Column("best_score", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("runs_completed", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("last_outcome", sa.String(32), nullable=True),
            sa.Column("last_lessons", sa.JSON(), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
            sa.UniqueConstraint("user_id", "module", name="uq_lab_progress_user_module"),
        )
        op.create_index("ix_lab_progress_user_id", "lab_progress", ["user_id"])
    if "lab_xp_grants" not in existing:
        op.create_table(
            "lab_xp_grants",
            sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
            sa.Column("user_id", sa.Uuid(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
            sa.Column("day", sa.Date(), nullable=False),
            sa.Column("xp", sa.Integer(), nullable=False, server_default="0"),
            sa.UniqueConstraint("user_id", "day", name="uq_lab_xp_user_day"),
        )
        op.create_index("ix_lab_xp_grants_user_id", "lab_xp_grants", ["user_id"])


def downgrade():
    op.drop_table("lab_xp_grants")
    op.drop_table("lab_progress")
