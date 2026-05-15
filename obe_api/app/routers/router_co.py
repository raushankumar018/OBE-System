"""
router_co.py
────────────
API 1 — Course Upload + CO Generation (iterative refinement loop)

Flow:
  POST /co/generate         — Upload syllabus (PDF/DOCX/TXT) + course metadata
                              → Returns session_id + generated COs + question prompt
  POST /co/feedback         — User says satisfied=True/False + optional feedback text
                              → If False: regenerate with feedback
                              → If can't satisfy after N tries: ask user to provide their own COs
  POST /co/confirm          — User confirms COs, session moves to "confirmed"
  GET  /co/session/{id}     — Get current session state
"""

import os
import uuid
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends
from fastapi.responses import JSONResponse

from app.config import get_settings
from app.database import co_sessions_col, courses_col
from app.models.schemas import (
    CourseMetadata, COGenerationResponse, COFeedbackRequest,
    COConfirmRequest, COItem
)
from app.services.obe_engine import (
    extract_text_from_file, parse_pos, parse_psos, parse_units,
    analyze_syllabus, generate_and_validate_cos, STANDARD_POS
)

router   = APIRouter(prefix="/co", tags=["Course Outcomes"])
settings = get_settings()

MAX_REFINEMENT_ATTEMPTS = 3   # After this many failures → ask user to provide own COs


def _normalize_session_id(session_id: str) -> str:
    """Trim common copy/paste artifacts before MongoDB lookups."""
    return session_id.strip().strip('"').strip("'")


def _session_to_response(session: dict) -> COGenerationResponse:
    return COGenerationResponse(
        session_id=session["session_id"],
        course_code=session["course_code"],
        status=session["status"],
        iteration=session["iteration"],
        cos=[COItem(**c) for c in session["cos"]],
        message=session["message"],
    )


# ════════════════════════════════════════════════════════════════════════════
# POST /co/generate
# ════════════════════════════════════════════════════════════════════════════
@router.post("/generate", response_model=COGenerationResponse, summary="Upload syllabus and generate COs")
async def generate_cos(
    file: Optional[UploadFile] = File(None, description="Syllabus PDF, DOCX, or TXT"),
    syllabus_text: Optional[str] = Form(None, description="Paste syllabus text directly"),
    course_code:   str  = Form(...),
    course_name:   str  = Form(...),
    university:    str  = Form("Vignan's University"),
    department:    str  = Form("Computer Science and Engineering"),
    degree:        str  = Form("B.Tech"),
    academic_year: str  = Form("2025-26"),
    semester:      str  = Form("III"),
    coordinator:   str  = Form(""),
    num_students:  int  = Form(60),
    num_cos_target: int = Form(4),
    num_modules:   int  = Form(2),
):
    """
    Step 1: Upload syllabus and course metadata to generate Course Outcomes.

    - **file**: Upload a PDF, DOCX, or TXT file of the syllabus
    - **syllabus_text**: Or paste the syllabus text directly
    - Returns a **session_id** — use it in all subsequent CO endpoints
    """
    # ── Extract syllabus text ──────────────────────────────────────────────
    if file:
        os.makedirs(settings.upload_dir, exist_ok=True)
        file_path = os.path.join(settings.upload_dir, f"{uuid.uuid4()}_{file.filename}")
        content = await file.read()
        if len(content) > settings.max_upload_mb * 1024 * 1024:
            raise HTTPException(413, f"File too large. Max {settings.max_upload_mb}MB.")
        with open(file_path, "wb") as f:
            f.write(content)
        try:
            raw_text = extract_text_from_file(file_path, file.filename)
        finally:
            os.remove(file_path)
    elif syllabus_text:
        raw_text = syllabus_text.strip()
    else:
        raise HTTPException(422, "Provide either a file upload or syllabus_text.")

    if len(raw_text) < 100:
        raise HTTPException(422, "Syllabus text too short. Please provide full syllabus content.")

    # ── Parse POs, PSOs, Units ────────────────────────────────────────────
    po_dict   = parse_pos(raw_text, STANDARD_POS)
    pso_dict  = parse_psos(raw_text)
    units_raw = parse_units(raw_text)

    if not units_raw:
        raise HTTPException(422, "Could not detect UNIT sections in the syllabus. "
                                 "Ensure syllabus has 'UNIT 1:', 'UNIT 2:' headings.")

    # ── Analyze syllabus with LLM ─────────────────────────────────────────
    try:
        analysis = analyze_syllabus(
            raw_text, units_raw, course_code, course_name, department, degree,
            settings.groq_api_key, settings.groq_model
        )
    except Exception as e:
        raise HTTPException(500, f"Syllabus analysis failed: {e}")

    # ── Generate COs ─────────────────────────────────────────────────────
    try:
        cos = generate_and_validate_cos(
            raw_text, analysis, po_dict, pso_dict,
            num_cos_target, course_code, course_name, department, degree,
            settings.groq_api_key, settings.groq_model
        )
    except Exception as e:
        raise HTTPException(500, f"CO generation failed: {e}")

    # ── Build session ─────────────────────────────────────────────────────
    session_id = str(uuid.uuid4())
    session = {
        "session_id":   session_id,
        "course_code":  course_code,
        "course_name":  course_name,
        "university":   university,
        "department":   department,
        "degree":       degree,
        "academic_year": academic_year,
        "semester":     semester,
        "coordinator":  coordinator,
        "num_students": num_students,
        "num_cos_target": num_cos_target,
        "num_modules":  num_modules,
        "status":       "generated",
        "iteration":    1,
        "cos":          cos,
        "po_dict":      po_dict,
        "pso_dict":     pso_dict,
        "syllabus_text": raw_text,
        "syllabus_analysis": analysis,
        "units_raw":    units_raw,
        "feedback_history": [],
        "message": (
            "COs have been generated. Please review them above.\n"
            "Are you satisfied with these Course Outcomes?\n"
            "→ If YES: call POST /co/feedback with satisfied=true\n"
            "→ If NO:  call POST /co/feedback with satisfied=false and describe what to change"
        ),
        "created_at": datetime.utcnow().isoformat(),
        "updated_at": datetime.utcnow().isoformat(),
    }
    await co_sessions_col().insert_one(session)

    return _session_to_response(session)


# ════════════════════════════════════════════════════════════════════════════
# POST /co/feedback
# ════════════════════════════════════════════════════════════════════════════
@router.post("/feedback", response_model=COGenerationResponse, summary="Give feedback to refine COs")
async def co_feedback(req: COFeedbackRequest):
    """
    Step 2 (repeatable): Provide feedback on generated COs.

    - **satisfied=true**:  Confirms COs and moves session to 'confirmed'
    - **satisfied=false + feedback**: Regenerates COs addressing your feedback
    - **user_provided_cos**: If you want to skip AI generation and provide your own COs
    - After `MAX_REFINEMENT_ATTEMPTS` failed attempts, the system will ask you to provide your own COs
    """
    normalized_session_id = _normalize_session_id(req.session_id)
    session = await co_sessions_col().find_one({"session_id": normalized_session_id})
    if not session:
        raise HTTPException(
            404,
            "Session not found. Use the exact session_id returned by POST /co/generate "
            f"(received: {req.session_id!r}, normalized: {normalized_session_id!r}).",
        )
    if session["status"] == "confirmed":
        raise HTTPException(400, "Session already confirmed. Proceed to CO-PO mapping.")

    # ── User provides their own COs ───────────────────────────────────────
    if req.user_provided_cos:
        parsed_cos = []
        for i, item in enumerate(req.user_provided_cos, 1):
            co_id  = item.get("co_id",  f"CO{i}")
            text   = item.get("co_text", "")
            if not text:
                continue
            parsed_cos.append({
                "co_id":       co_id,
                "unit_no":     i,
                "co_text":     text,
                "bloom_level": item.get("bloom_level", "Apply"),
                "po_mapping":  item.get("po_mapping",  [f"PO{i}"]),
                "pso_mapping": item.get("pso_mapping", ["PSO1"]),
            })
        if not parsed_cos:
            raise HTTPException(422, "No valid COs found in user_provided_cos.")

        update = {
            "status":     "user_provided",
            "cos":        parsed_cos,
            "iteration":  session["iteration"],
            "message":    (
                "Your custom COs have been saved.\n"
                "Call POST /co/confirm to finalize and proceed to CO-PO mapping."
            ),
            "updated_at": datetime.utcnow().isoformat(),
        }
        await co_sessions_col().update_one({"session_id": normalized_session_id}, {"$set": update})
        session.update(update)
        return _session_to_response(session)

    # ── User is satisfied ─────────────────────────────────────────────────
    if req.satisfied:
        update = {
            "status":    "confirmed",
            "message":   (
                "COs confirmed! Now call POST /mapping/generate to compute CO-PO-PSO mapping.\n"
                f"Use session_id: {session['session_id']}"
            ),
            "updated_at": datetime.utcnow().isoformat(),
        }
        await co_sessions_col().update_one({"session_id": normalized_session_id}, {"$set": update})
        session.update(update)
        return _session_to_response(session)

    # ── User not satisfied — regenerate ────────────────────────────────────
    iteration = session["iteration"]
    if iteration >= MAX_REFINEMENT_ATTEMPTS:
        update = {
            "status":    "awaiting_user_cos",
            "iteration": iteration + 1,
            "message":   (
                f"After {MAX_REFINEMENT_ATTEMPTS} attempts, the AI could not generate COs to your satisfaction.\n"
                "Please provide your own COs by calling POST /co/feedback with user_provided_cos.\n\n"
                "Format: [{\"co_id\":\"CO1\",\"co_text\":\"...\",\"bloom_level\":\"Apply\","
                "\"po_mapping\":[\"PO1\",\"PO2\"],\"pso_mapping\":[\"PSO1\"]}]"
            ),
            "updated_at": datetime.utcnow().isoformat(),
        }
        await co_sessions_col().update_one({"session_id": normalized_session_id}, {"$set": update})
        session.update(update)
        return _session_to_response(session)

    if not req.feedback:
        raise HTTPException(422, "Please provide feedback text describing what to change.")

    # Add to history
    feedback_history = session.get("feedback_history", [])
    feedback_history.append({"iteration": iteration, "feedback": req.feedback})

    # Compile all feedback for context
    all_feedback = "\n".join(
        f"Attempt {fb['iteration']}: {fb['feedback']}"
        for fb in feedback_history
    )

    try:
        new_cos = generate_and_validate_cos(
            session["syllabus_text"],
            session["syllabus_analysis"],
            session["po_dict"],
            session["pso_dict"],
            session["num_cos_target"],
            session["course_code"],
            session["course_name"],
            session["department"],
            session["degree"],
            settings.groq_api_key,
            settings.groq_model,
            feedback=all_feedback,
            current_cos=session.get("cos", []),
        )
    except Exception as e:
        raise HTTPException(500, f"CO regeneration failed: {e}")

    update = {
        "status":           "revised",
        "iteration":        iteration + 1,
        "cos":              new_cos,
        "feedback_history": feedback_history,
        "message":          (
            f"COs revised (attempt {iteration + 1}/{MAX_REFINEMENT_ATTEMPTS}).\n"
            "Are you satisfied now?\n"
            "→ YES: POST /co/feedback  satisfied=true\n"
            "→ NO:  POST /co/feedback  satisfied=false + new feedback"
        ),
        "updated_at": datetime.utcnow().isoformat(),
    }
    await co_sessions_col().update_one({"session_id": normalized_session_id}, {"$set": update})
    session.update(update)
    return _session_to_response(session)


# ════════════════════════════════════════════════════════════════════════════
# POST /co/confirm  (explicit confirm shortcut)
# ════════════════════════════════════════════════════════════════════════════
@router.post("/confirm", response_model=COGenerationResponse, summary="Confirm COs and proceed")
async def confirm_cos(req: COConfirmRequest):
    """Explicitly confirm the current COs and lock the session."""
    normalized_session_id = _normalize_session_id(req.session_id)
    session = await co_sessions_col().find_one({"session_id": normalized_session_id})
    if not session:
        raise HTTPException(
            404,
            "Session not found. Use the exact session_id returned by POST /co/generate "
            f"(received: {req.session_id!r}, normalized: {normalized_session_id!r}).",
        )

    update = {
        "status":    "confirmed",
        "message":   (
            "COs confirmed! Now call POST /mapping/generate to compute CO-PO-PSO mapping.\n"
            f"session_id: {session['session_id']}"
        ),
        "updated_at": datetime.utcnow().isoformat(),
    }
    await co_sessions_col().update_one({"session_id": normalized_session_id}, {"$set": update})
    session.update(update)
    return _session_to_response(session)


# ════════════════════════════════════════════════════════════════════════════
# GET /co/session/{session_id}
# ════════════════════════════════════════════════════════════════════════════
@router.get("/session/{session_id}", response_model=COGenerationResponse, summary="Get session state")
async def get_session(session_id: str):
    """Retrieve the current state of a CO generation session."""
    session = await co_sessions_col().find_one({"session_id": session_id})
    if not session:
        raise HTTPException(404, f"Session {session_id} not found.")
    return _session_to_response(session)
