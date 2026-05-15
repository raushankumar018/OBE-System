"""
router_mapping.py
─────────────────
API 2 — CO-PO-PSO Mapping

  POST /mapping/generate       — Run hybrid mapping for a confirmed CO session
  GET  /mapping/{session_id}   — Get mapping results
"""

from datetime import datetime
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.config import get_settings
from app.database import co_sessions_col, mappings_col
from app.models.schemas import COPOMappingResponse, COItem
from app.services.obe_engine import build_co_po_matrix, STANDARD_POS

router   = APIRouter(prefix="/mapping", tags=["CO-PO-PSO Mapping"])
settings = get_settings()

ALL_POS = [f"PO{i}" for i in range(1, 13)]


class MappingRequest(BaseModel):
    session_id: str


@router.post("/generate", response_model=COPOMappingResponse,
             summary="Generate CO-PO-PSO mapping for confirmed COs")
async def generate_mapping(req: MappingRequest):
    """
    Step 3: Run CO-PO-PSO mapping.

    Requires the session to be in **confirmed** or **user_provided** status.
    Uses hybrid approach:
    1. Semantic cosine similarity (sentence-transformers)
    2. LLM assigns High / Moderate / Low strength
    3. NBA compliance check (min 2 POs per CO)
    """
    session = await co_sessions_col().find_one({"session_id": req.session_id})
    if not session:
        raise HTTPException(404, f"Session {req.session_id} not found.")
    if session["status"] not in ("confirmed", "user_provided"):
        raise HTTPException(400,
            f"Session status is '{session['status']}'. "
            "COs must be confirmed before mapping. "
            "Call POST /co/feedback with satisfied=true first.")

    cos      = session["cos"]
    po_dict  = session.get("po_dict", STANDARD_POS)
    pso_dict = session.get("pso_dict", {
        "PSO1": "Apply domain-specific principles to design, develop and deploy scalable solutions.",
        "PSO2": "Use modern software tools, frameworks and methods to build real-world systems.",
    })

    try:
        matrix_label, matrix_num = build_co_po_matrix(
            cos, po_dict, pso_dict, settings.groq_api_key, settings.groq_model
        )
    except Exception as e:
        raise HTTPException(500, f"Mapping computation failed: {e}")

    # Average PO strength
    all_psos = list(pso_dict.keys())
    all_cols = ALL_POS + all_psos
    avg_po = {}
    for po in ALL_POS:
        vals = [matrix_num.get(c["co_id"], {}).get(po, 0) for c in cos]
        nz   = [v for v in vals if v > 0]
        avg_po[po] = round(sum(nz) / len(nz), 2) if nz else 0.0

    # Persist mapping to DB
    mapping_doc = {
        "session_id":   req.session_id,
        "course_code":  session["course_code"],
        "cos":          cos,
        "po_dict":      po_dict,
        "pso_dict":     pso_dict,
        "matrix_label": matrix_label,
        "matrix_num":   matrix_num,
        "avg_po_strength": avg_po,
        "created_at":   datetime.utcnow().isoformat(),
    }
    await mappings_col().replace_one(
        {"session_id": req.session_id}, mapping_doc, upsert=True
    )

    # Update session status
    await co_sessions_col().update_one(
        {"session_id": req.session_id},
        {"$set": {"status": "mapped", "updated_at": datetime.utcnow().isoformat()}}
    )

    return COPOMappingResponse(
        session_id=req.session_id,
        course_code=session["course_code"],
        cos=[COItem(**c) for c in cos],
        po_dict=po_dict,
        pso_dict=pso_dict,
        matrix_label=matrix_label,
        matrix_numeric=matrix_num,
        average_po_strength=avg_po,
        message=(
            "CO-PO-PSO mapping complete!\n\n"
            "Matrix legend: High=3 (direct relation), Moderate=2 (partial), Low=1 (minor), --=none\n\n"
            "Next: Upload student marks via POST /attainment/calculate\n"
            f"session_id: {req.session_id}"
        ),
    )


@router.get("/{session_id}", response_model=COPOMappingResponse,
            summary="Retrieve CO-PO-PSO mapping for a session")
async def get_mapping(session_id: str):
    """Retrieve previously computed CO-PO-PSO mapping."""
    doc = await mappings_col().find_one({"session_id": session_id})
    if not doc:
        raise HTTPException(404, f"No mapping found for session {session_id}. "
                                  "Call POST /mapping/generate first.")
    return COPOMappingResponse(
        session_id=doc["session_id"],
        course_code=doc["course_code"],
        cos=[COItem(**c) for c in doc["cos"]],
        po_dict=doc["po_dict"],
        pso_dict=doc["pso_dict"],
        matrix_label=doc["matrix_label"],
        matrix_numeric=doc["matrix_num"],
        average_po_strength=doc.get("avg_po_strength", {}),
        message="Mapping retrieved from database.",
    )
