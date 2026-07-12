"""Initial assessment storage."""

import sqlalchemy as sa

from alembic import op

revision = "20260711_0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "assessments",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("token_hash", sa.String(64), nullable=False),
        sa.Column("status", sa.String(32), nullable=False),
        sa.Column("crop", sa.String(32), nullable=False),
        sa.Column("growth_stage", sa.String(80), nullable=False),
        sa.Column("region", sa.String(120)),
        sa.Column("symptom_duration", sa.String(120), nullable=False),
        sa.Column("watering_conditions", sa.String(200), nullable=False),
        sa.Column("description", sa.Text()),
        sa.Column("language", sa.String(8), nullable=False),
        sa.Column("demo_scenario", sa.String(64)),
        sa.Column("images", sa.JSON(), nullable=False),
        sa.Column("image_quality", sa.JSON()),
        sa.Column("model_observation", sa.JSON()),
        sa.Column("initial_assessment", sa.JSON()),
        sa.Column("answers", sa.JSON()),
        sa.Column("final_assessment", sa.JSON()),
        sa.Column("verification", sa.JSON()),
        sa.Column("provider_metadata", sa.JSON(), nullable=False),
        sa.Column("timing_metadata", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True)),
    )
    op.create_index("ix_assessments_created_at", "assessments", ["created_at"])
    op.create_index("ix_assessments_token_hash", "assessments", ["token_hash"])


def downgrade() -> None:
    op.drop_index("ix_assessments_token_hash", table_name="assessments")
    op.drop_index("ix_assessments_created_at", table_name="assessments")
    op.drop_table("assessments")
