"""
API Routes – Blueprint
Endpoints:
  POST   /api/history          – Save a calculation
  GET    /api/history          – Fetch paginated history
  DELETE /api/history/<id>     – Delete one record
  DELETE /api/history          – Clear all (optionally by session)
  GET    /api/memory/<session> – Get memory value
  PUT    /api/memory/<session> – Set memory value
  GET    /api/health           – Health check
"""

from datetime import datetime, timezone
from flask import Blueprint, jsonify, request
from sqlalchemy import desc
from .extensions import db
from .models import Calculation, MemorySlot

api_bp = Blueprint("api", __name__)

# ─── Helpers ─────────────────────────────────────────────────────────────────

def bad_request(msg: str, code: int = 400):
    return jsonify({"ok": False, "error": msg}), code

def ok(data=None, **kwargs):
    payload = {"ok": True}
    if data is not None:
        payload["data"] = data
    payload.update(kwargs)
    return jsonify(payload)


# ─── Health ──────────────────────────────────────────────────────────────────

@api_bp.get("/health")
def health():
    return ok({"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()})


# ─── Calculation History ─────────────────────────────────────────────────────

@api_bp.post("/history")
def save_calculation():
    """Save a completed calculation to the database."""
    body = request.get_json(silent=True) or {}

    expression = (body.get("expression") or "").strip()
    result     = (body.get("result")     or "").strip()
    mode       = body.get("mode", "standard")
    session_id = body.get("session_id", "anonymous")

    if not expression or not result:
        return bad_request("'expression' and 'result' are required.")
    if mode not in ("standard", "scientific"):
        mode = "standard"

    calc = Calculation(
        expression=expression[:512],
        result=result[:128],
        mode=mode,
        session_id=session_id[:64],
    )
    db.session.add(calc)
    db.session.commit()

    return ok(calc.to_dict()), 201


@api_bp.get("/history")
def get_history():
    """Return paginated calculation history."""
    session_id = request.args.get("session_id")
    page       = max(1, int(request.args.get("page", 1)))
    per_page   = min(100, max(1, int(request.args.get("per_page", 20))))

    query = Calculation.query.order_by(desc(Calculation.created_at))
    if session_id:
        query = query.filter_by(session_id=session_id)

    pagination = query.paginate(page=page, per_page=per_page, error_out=False)

    return ok(
        [c.to_dict() for c in pagination.items],
        total=pagination.total,
        pages=pagination.pages,
        page=page,
        per_page=per_page,
    )


@api_bp.delete("/history/<int:calc_id>")
def delete_calculation(calc_id: int):
    """Delete a single history record."""
    calc = db.session.get(Calculation, calc_id)
    if not calc:
        return bad_request("Record not found.", 404)
    db.session.delete(calc)
    db.session.commit()
    return ok({"deleted_id": calc_id})


@api_bp.delete("/history")
def clear_history():
    """Clear all history or just a session's history."""
    session_id = request.args.get("session_id")
    query = Calculation.query
    if session_id:
        query = query.filter_by(session_id=session_id)
    count = query.delete(synchronize_session=False)
    db.session.commit()
    return ok({"deleted_count": count})


# ─── Memory ──────────────────────────────────────────────────────────────────

@api_bp.get("/memory/<session_id>")
def get_memory(session_id: str):
    """Retrieve the memory value for a session."""
    slot = MemorySlot.query.filter_by(session_id=session_id).first()
    if not slot:
        return ok({"session_id": session_id, "value": 0.0})
    return ok(slot.to_dict())


@api_bp.put("/memory/<session_id>")
def set_memory(session_id: str):
    """Store or update the memory value for a session."""
    body  = request.get_json(silent=True) or {}
    value = body.get("value", 0.0)

    try:
        value = float(value)
    except (TypeError, ValueError):
        return bad_request("'value' must be a number.")

    slot = MemorySlot.query.filter_by(session_id=session_id).first()
    if slot:
        slot.value      = value
        slot.updated_at = datetime.now(timezone.utc)
    else:
        slot = MemorySlot(session_id=session_id[:64], value=value)
        db.session.add(slot)

    db.session.commit()
    return ok(slot.to_dict())
