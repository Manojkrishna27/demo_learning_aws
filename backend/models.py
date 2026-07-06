"""
Database models.
"""

from datetime import datetime, timezone
from .extensions import db


class Calculation(db.Model):
    """Persists every calculation performed by users."""

    __tablename__ = "calculations"

    id         = db.Column(db.Integer, primary_key=True)
    expression = db.Column(db.String(512), nullable=False)
    result     = db.Column(db.String(128), nullable=False)
    mode       = db.Column(db.String(16), default="standard")   # standard | scientific
    session_id = db.Column(db.String(64), nullable=True, index=True)
    created_at = db.Column(
        db.DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    def to_dict(self) -> dict:
        return {
            "id":         self.id,
            "expression": self.expression,
            "result":     self.result,
            "mode":       self.mode,
            "session_id": self.session_id,
            "created_at": self.created_at.isoformat(),
        }


class MemorySlot(db.Model):
    """Stores per-session memory values."""

    __tablename__ = "memory_slots"

    id         = db.Column(db.Integer, primary_key=True)
    session_id = db.Column(db.String(64), unique=True, nullable=False, index=True)
    value      = db.Column(db.Float, default=0.0, nullable=False)
    updated_at = db.Column(
        db.DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    def to_dict(self) -> dict:
        return {
            "session_id": self.session_id,
            "value":      self.value,
            "updated_at": self.updated_at.isoformat(),
        }
