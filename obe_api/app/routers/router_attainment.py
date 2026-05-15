"""
router_attainment.py
────────────────────
API 3 — Attainment Calculation + Report Generation + Download

  POST /attainment/calculate        — Upload question paper + student marks (PDF/Excel)
                                       → Compute CO/PO/PSO attainment, save to MongoDB, return PDF+Excel
  GET  /attainment/download/pdf     — Re-download attainment PDF from stored DB data
  GET  /attainment/download/excel   — Re-download attainment Excel from stored DB data
  GET  /attainment/history          — List all stored attainment records
  GET  /attainment/{course_code}/{academic_year} — Get stored attainment data as JSON
"""

import os
import time
import uuid
from glob import glob
from datetime import datetime
from typing import Optional

import numpy as np
import pandas as pd
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import FileResponse, JSONResponse

from app.config import get_settings
from app.database import co_sessions_col, mappings_col, attainment_col, students_col
from app.models.schemas import AttainmentResponse, COAttainmentRow, POAttainmentRow
from app.services.obe_engine import (
    extract_text_from_file, extract_marks_from_excel,
    build_question_bank, map_questions_to_cos, compute_attainment,
    STANDARD_POS, attainment_level
)
from app.services.report_service import (
    generate_dashboard_image, generate_pdf_report, generate_excel_report
)
from app.services.vfstr_report_service import (
    is_vfstr_marks_workbook, parse_vfstr_marks_workbook,
    build_vfstr_attainment_data, generate_vfstr_excel_report,
)

router   = APIRouter(prefix="/attainment", tags=["Attainment"])
settings = get_settings()


def _to_native(value):
    """Convert pandas/numpy scalars into plain Python types for Mongo/Pydantic."""
    if isinstance(value, dict):
        return {k: _to_native(v) for k, v in value.items()}
    if isinstance(value, list):
        return [_to_native(v) for v in value]
    if isinstance(value, tuple):
        return [_to_native(v) for v in value]
    if isinstance(value, np.generic):
        return value.item()
    if isinstance(value, float) and pd.isna(value):
        return None
    if isinstance(value, str):
        return value
    try:
        if pd.isna(value):
            return None
    except Exception:
        pass
    return value


def _safe_remove(path: str, retries: int = 5, delay: float = 0.2) -> None:
    """Best-effort file cleanup that tolerates transient Windows file locks."""
    if not path or not os.path.exists(path):
        return
    for attempt in range(retries):
        try:
            os.remove(path)
            return
        except PermissionError:
            if attempt == retries - 1:
                print(f"Cleanup warning: could not remove locked file {path}")
                return
            time.sleep(delay)
        except FileNotFoundError:
            return


def _doc_to_attainment_response(doc: dict) -> AttainmentResponse:
    """Normalize stored MongoDB attainment docs to the public response shape."""
    data = doc.get("attainment_data", {})
    metadata = data.get("metadata", {})
    co_att = data.get("co_attainment", [])
    po_att = data.get("po_attainment", [])
    pso_att = data.get("pso_attainment", [])
    att_count = sum(1 for row in co_att if row.get("Attained") == "Attained")

    return AttainmentResponse(
        session_id=doc.get("session_id", metadata.get("session_id", "")),
        course_code=doc.get("course_code", metadata.get("course_code", "")),
        academic_year=doc.get("academic_year", metadata.get("academic_year", "")),
        num_students=metadata.get("num_students", 60),
        co_attainment=[COAttainmentRow(
            co_id=row["CO_ID"],
            co_text=row.get("CO_Text", ""),
            bloom_level=row.get("Bloom_Level", ""),
            ia_pct=row["IA_Pct"],
            ete_pct=row["ETE_Pct"],
            da_score=row["DA_Score"],
            ida_score=row["IDA_Score"],
            final_score=row["Final_Score"],
            class_level=row["Class_Level"],
            attained=row["Attained"],
            students_level1=row["Students_Level1"],
            students_level2=row["Students_Level2"],
            students_level3=row["Students_Level3"],
        ) for row in co_att],
        po_attainment=[POAttainmentRow(
            outcome=row["outcome"],
            description=row["description"],
            score=row["score"],
            attainment_pct=row["attainment_pct"],
            level=row["level"],
            contributors=row["contributors"],
        ) for row in po_att],
        pso_attainment=[POAttainmentRow(
            outcome=row["outcome"],
            description=row["description"],
            score=row["score"],
            attainment_pct=row["attainment_pct"],
            level=row["level"],
            contributors=row["contributors"],
        ) for row in pso_att],
        attained_count=att_count,
        total_cos=len(co_att),
        pdf_download_url=f"/attainment/download/pdf/{doc.get('course_code')}/{doc.get('academic_year')}",
        excel_download_url=f"/attainment/download/excel/{doc.get('course_code')}/{doc.get('academic_year')}",
        saved_to_db=True,
    )


def _cfg_from_session(session: dict) -> dict:
    """Extract exam-structure config dict from session document."""
    return {
        "num_modules":     session.get("num_modules", 2),
        "t1_parta_bits":   session.get("t1_parta_bits",  {"a": 2, "b": 4, "c": 4}),
        "t1_partb_bits":   session.get("t1_partb_bits",  {"a": 2, "b": 4, "c": 4}),
        "t2_max":          session.get("t2_max", 5),
        "t3_max":          session.get("t3_max", 5),
        "t4_mcq_count":    session.get("t4_mcq_count", 10),
        "t4_mcq_marks":    session.get("t4_mcq_marks", 0.5),
        "t4_desc_count":   session.get("t4_desc_count", 3),
        "t4_desc_marks":   session.get("t4_desc_marks", 5),
        "t4_desc_bits":    session.get("t4_desc_bits",  {"a": 2, "b": 2, "c": 1}),
        "t5_cla_count":    session.get("t5_cla_count", 4),
        "t5_cla_marks":    session.get("t5_cla_marks", 20),
        "lab_ext_max":     session.get("lab_ext_max", 20),
        "ete_parta_count": session.get("ete_parta_count", 4),
        "ete_parta_marks": session.get("ete_parta_marks", 8),
        "ete_parta_bits":  session.get("ete_parta_bits", {"a": 3, "b": 3, "c": 2}),
        "ete_partb_count": session.get("ete_partb_count", 2),
        "ete_partb_marks": session.get("ete_partb_marks", 14),
        "ete_partb_bits":  session.get("ete_partb_bits", {"a": 5, "b": 5, "c": 4}),
        "w_ia":            session.get("w_ia", 0.60),
        "w_ete":           session.get("w_ete", 0.40),
        "w_direct":        session.get("w_direct", 0.80),
        "w_indirect":      session.get("w_indirect", 0.20),
        "indirect_score":  session.get("indirect_score", 3.0),
        "target_attainment": session.get("target_attainment", 1.67),
    }


def _generate_excel_with_fallback(attainment_data: dict, excel_path: str) -> None:
    """Generate Excel, using the VFSTR template when available and a generic workbook otherwise."""
    if attainment_data.get("report_format") == "vfstr_template":
        template_path = settings.vfstr_template_path
        if template_path and os.path.exists(template_path):
            generate_vfstr_excel_report(attainment_data, excel_path, template_path)
            return
        print(f"VFSTR template missing, falling back to generic Excel report: {template_path}")
    generate_excel_report(attainment_data, excel_path)


# ════════════════════════════════════════════════════════════════════════════
# POST /attainment/calculate
# ════════════════════════════════════════════════════════════════════════════
@router.post("/calculate", summary="Upload marks and compute attainment")
async def calculate_attainment(
    session_id: str = Form(..., description="Session ID from CO generation step"),
    marks_file: UploadFile = File(...,
        description="Student marks Excel file. Columns: Roll_No, Question_ID, Marks_Obtained"),
    question_paper: UploadFile = File(...,
        description="Question paper PDF/DOCX/TXT used for question-to-CO mapping"),
    indirect_score: float = Form(3.0,
        description="Course Exit Survey average (0–5)"),
):
    """
    Step 4: Upload student marks and compute full CO/PO/PSO attainment.

    **marks_file (Excel)** — required columns:
    - `Roll_No` — student roll number
    - `Question_ID` — matches question bank IDs (e.g., M1_MB3_a, M2_T1B_b, ETE_A1_a)
    - `Marks_Obtained` — marks scored

    The marks file and question paper are required. The system does not generate
    simulated/random marks.

    **Returns:**
    - Full attainment report (JSON)
    - Download links for PDF and Excel reports
    - Data saved to MongoDB for future re-download
    """
    # ── Validate session ──────────────────────────────────────────────────
    session = await co_sessions_col().find_one({"session_id": session_id})
    if not session:
        raise HTTPException(404, f"Session {session_id} not found.")
    if session["status"] not in ("mapped", "confirmed", "user_provided", "completed"):
        raise HTTPException(400,
            f"Session status is '{session['status']}'. "
            "Run CO-PO mapping first via POST /mapping/generate.")

    # ── Load mapping ──────────────────────────────────────────────────────
    mapping_doc = await mappings_col().find_one({"session_id": session_id})
    if not mapping_doc:
        raise HTTPException(400, "CO-PO mapping not found. Run POST /mapping/generate first.")

    cos        = session["cos"]
    po_dict    = session.get("po_dict", STANDARD_POS)
    pso_dict   = session.get("pso_dict", {
        "PSO1": "Apply domain-specific principles to design scalable solutions.",
        "PSO2": "Use modern software tools to build real-world systems.",
    })
    matrix_num = mapping_doc["matrix_num"]
    cfg        = _cfg_from_session(session)
    cfg["indirect_score"] = indirect_score

    # ── Build question bank ───────────────────────────────────────────────
    q_bank = build_question_bank(cfg)

    os.makedirs(settings.upload_dir, exist_ok=True)
    qp_path = os.path.join(settings.upload_dir, f"{uuid.uuid4()}_{question_paper.filename}")
    qp_content = await question_paper.read()
    with open(qp_path, "wb") as f:
        f.write(qp_content)
    try:
        question_paper_text = extract_text_from_file(qp_path, question_paper.filename)
    except Exception as e:
        raise HTTPException(422, f"Question paper extraction failed: {e}")
    finally:
        _safe_remove(qp_path)

    if not question_paper_text.strip():
        msg = "Question paper text could not be extracted. Upload a readable PDF, DOCX, or TXT file."
        print(f"Attainment validation error: {msg}")
        raise HTTPException(422, msg)

    # ── Map questions to COs ──────────────────────────────────────────────
    try:
        q_mapped = map_questions_to_cos(
            q_bank, cos, len(cos), settings.groq_api_key, settings.groq_model,
            question_paper_text
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Question mapping failed: {e}")

    # ── Load student marks ────────────────────────────────────────────────
    mark_records = []
    use_vfstr_flow = False
    if marks_file:
        os.makedirs(settings.upload_dir, exist_ok=True)
        fpath = os.path.join(settings.upload_dir, f"{uuid.uuid4()}_{marks_file.filename}")
        content = await marks_file.read()
        with open(fpath, "wb") as f:
            f.write(content)
        try:
            if is_vfstr_marks_workbook(fpath):
                parsed_vfstr = parse_vfstr_marks_workbook(fpath)
                use_vfstr_flow = True
            else:
                marks_raw = extract_marks_from_excel(fpath)

                # Merge with question bank to get Max_Marks, Mapped_CO, Exam, Module
                q_meta = q_mapped.set_index("Question_ID")[["Max_Marks", "Mapped_CO", "Exam", "Module"]].to_dict("index")
                rows = []
                for _, r in marks_raw.iterrows():
                    if pd.isna(r["Marks_Obtained"]):
                        continue
                    qid  = str(r["Question_ID"])
                    meta = q_meta.get(qid, {})
                    if not meta:
                        continue
                    marks_obtained = float(r["Marks_Obtained"])
                    max_marks = float(meta["Max_Marks"])
                    if marks_obtained < 0 or marks_obtained > max_marks:
                        msg = f"Invalid marks for {qid}: {marks_obtained} exceeds max {max_marks}."
                        print(f"Attainment validation error: {msg}")
                        raise HTTPException(422, msg)
                    rows.append({
                        "Roll_No":        str(r["Roll_No"]),
                        "Question_ID":    qid,
                        "Marks_Obtained": marks_obtained,
                        "Max_Marks":      max_marks,
                        "Mapped_CO":      meta["Mapped_CO"],
                        "Exam":           meta["Exam"],
                        "Module":         meta["Module"],
                    })
                if not rows:
                    msg = "No valid filled marks matched the question bank. Use the downloaded marks template Question_IDs and fill Marks_Obtained."
                    print(f"Attainment validation error: {msg}")
                    raise HTTPException(422, msg)
                marks_df = pd.DataFrame(rows)
                mark_records = marks_df.to_dict("records")
        finally:
            _safe_remove(fpath)

    # ── Compute attainment ────────────────────────────────────────────────
    try:
        if use_vfstr_flow:
            result = build_vfstr_attainment_data(parsed_vfstr, session, mapping_doc, indirect_score)
        else:
            result = compute_attainment(marks_df, cos, matrix_num, po_dict, pso_dict, cfg)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Attainment computation failed: {e}")

    # ── Generate reports ──────────────────────────────────────────────────
    os.makedirs(settings.output_dir, exist_ok=True)
    safe_code  = session["course_code"].replace("/", "_")
    safe_year  = session["academic_year"].replace("-", "_")
    base_name  = f"{safe_code}_{safe_year}_{session_id[:8]}"

    dashboard_path = os.path.join(settings.output_dir, f"{base_name}_dashboard.png")
    pdf_path       = os.path.join(settings.output_dir, f"{base_name}_report.pdf")
    excel_path     = os.path.join(settings.output_dir, f"{base_name}_report.xlsx")

    if use_vfstr_flow:
        full_data = result
    else:
        full_data = {
            **result,
            "cos":          cos,
            "matrix_label": mapping_doc["matrix_label"],
            "matrix_num":   matrix_num,
            "metadata": {
                "session_id":         session_id,
                "course_code":        session["course_code"],
                "course_name":        session["course_name"],
                "university":         session.get("university", ""),
                "department":         session.get("department", ""),
                "degree":             session.get("degree", ""),
                "academic_year":      session.get("academic_year", ""),
                "semester":           session.get("semester", ""),
                "coordinator":        session.get("coordinator", ""),
                "num_students":       session.get("num_students", 60),
                "target_attainment":  cfg["target_attainment"],
            }
        }
    full_data = _to_native(full_data)

    try:
        generate_dashboard_image(full_data, dashboard_path)
    except Exception as e:
        print(f"Dashboard generation warning: {e}")
        dashboard_path = None

    try:
        generate_pdf_report(full_data, pdf_path, dashboard_path)
    except HTTPException:
        raise
    except Exception as e:
        print(f"PDF generation warning: {e}")
        pdf_path = None

    try:
        _generate_excel_with_fallback(full_data, excel_path)
    except HTTPException:
        raise
    except Exception as e:
        print(f"Excel generation warning: {e}")
        excel_path = None

    # ── Save to MongoDB ───────────────────────────────────────────────────
    saved_to_db = True
    try:
        attainment_doc = {
            "session_id":     session_id,
            "course_code":    session["course_code"],
            "course_name":    session["course_name"],
            "academic_year":  session["academic_year"],
            "attainment_data": full_data,
            "report_paths": {
                "pdf":       pdf_path,
                "excel":     excel_path,
                "dashboard": dashboard_path,
            },
            "created_at":  datetime.utcnow().isoformat(),
            "updated_at":  datetime.utcnow().isoformat(),
        }
        await attainment_col().replace_one(
            {"course_code": session["course_code"], "academic_year": session["academic_year"]},
            attainment_doc, upsert=True
        )

        if mark_records:
            mark_records = _to_native(mark_records)
            await students_col().delete_many(
                {"course_code": session["course_code"], "academic_year": session["academic_year"]}
            )
            for rec in mark_records:
                rec["course_code"]   = session["course_code"]
                rec["academic_year"] = session["academic_year"]
            await students_col().insert_many(mark_records)

        await co_sessions_col().update_one(
            {"session_id": session_id},
            {"$set": {"status": "completed", "updated_at": datetime.utcnow().isoformat()}}
        )
    except Exception as e:
        saved_to_db = False
        print(f"Attainment persistence warning: {e}")

    co_att    = full_data.get("co_attainment", [])
    po_att    = full_data.get("po_attainment", [])
    pso_att   = full_data.get("pso_attainment", [])
    att_count = sum(1 for r in co_att if r.get("Attained") == "Attained")

    return AttainmentResponse(
        session_id=session_id,
        course_code=session["course_code"],
        academic_year=session["academic_year"],
        num_students=session.get("num_students", 60),
        co_attainment=[COAttainmentRow(
            co_id=r["CO_ID"], co_text=r.get("CO_Text",""),
            bloom_level=r.get("Bloom_Level",""),
            ia_pct=r["IA_Pct"], ete_pct=r["ETE_Pct"],
            da_score=r["DA_Score"], ida_score=r["IDA_Score"],
            final_score=r["Final_Score"], class_level=r["Class_Level"],
            attained=r["Attained"],
            students_level1=r["Students_Level1"],
            students_level2=r["Students_Level2"],
            students_level3=r["Students_Level3"],
        ) for r in co_att],
        po_attainment=[POAttainmentRow(
            outcome=r["outcome"], description=r["description"],
            score=r["score"], attainment_pct=r["attainment_pct"],
            level=r["level"], contributors=r["contributors"],
        ) for r in po_att],
        pso_attainment=[POAttainmentRow(
            outcome=r["outcome"], description=r["description"],
            score=r["score"], attainment_pct=r["attainment_pct"],
            level=r["level"], contributors=r["contributors"],
        ) for r in pso_att],
        attained_count=att_count,
        total_cos=len(cos),
        pdf_download_url=f"/attainment/download/pdf/{session['course_code']}/{session['academic_year']}",
        excel_download_url=f"/attainment/download/excel/{session['course_code']}/{session['academic_year']}",
        saved_to_db=saved_to_db,
    )


# ════════════════════════════════════════════════════════════════════════════
# GET /attainment/download/pdf/{course_code}/{academic_year}
# ════════════════════════════════════════════════════════════════════════════
@router.get("/download/pdf/{course_code}/{academic_year}",
            summary="Download attainment PDF report")
async def download_pdf(course_code: str, academic_year: str):
    """
    Download the attainment PDF report.
    Fetches stored data from MongoDB and regenerates the PDF if file is missing.
    """
    doc = await attainment_col().find_one(
        {"course_code": course_code, "academic_year": academic_year}
    )
    if not doc:
        raise HTTPException(404, f"No attainment data found for {course_code} / {academic_year}.")

    pdf_path = doc["report_paths"].get("pdf", "")
    if not pdf_path or not os.path.exists(pdf_path):
        # Regenerate from stored data
        os.makedirs(settings.output_dir, exist_ok=True)
        safe_code = course_code.replace("/", "_")
        safe_year = academic_year.replace("-", "_")
        pdf_path  = os.path.join(settings.output_dir, f"{safe_code}_{safe_year}_report.pdf")
        dash_path = doc["report_paths"].get("dashboard", "")
        try:
            generate_pdf_report(doc["attainment_data"], pdf_path,
                                 dash_path if os.path.exists(dash_path or "") else None)
        except Exception as e:
            raise HTTPException(500, f"PDF regeneration failed: {e}")
        await attainment_col().update_one(
            {"course_code": course_code, "academic_year": academic_year},
            {"$set": {"report_paths.pdf": pdf_path}}
        )

    return FileResponse(
        pdf_path,
        media_type="application/pdf",
        filename=f"OBE_Attainment_{course_code}_{academic_year}.pdf"
    )


# ════════════════════════════════════════════════════════════════════════════
# GET /attainment/download/excel/{course_code}/{academic_year}
# ════════════════════════════════════════════════════════════════════════════
@router.get("/download/excel/{course_code}/{academic_year}",
            summary="Download attainment Excel report")
async def download_excel(course_code: str, academic_year: str):
    """Download the attainment Excel report from stored DB data."""
    doc = await attainment_col().find_one(
        {"course_code": course_code, "academic_year": academic_year}
    )
    if not doc:
        raise HTTPException(404, f"No attainment data for {course_code} / {academic_year}.")

    report_paths = doc.get("report_paths") or {}
    excel_path = report_paths.get("excel", "")
    if not excel_path or not os.path.exists(excel_path):
        safe_code = course_code.replace("/", "_")
        safe_year = academic_year.replace("-", "_")
        existing_reports = sorted(
            glob(os.path.join(settings.output_dir, f"{safe_code}_{safe_year}_*_report.xlsx")),
            key=os.path.getmtime,
            reverse=True,
        )
        if existing_reports:
            excel_path = existing_reports[0]
            await attainment_col().update_one(
                {"course_code": course_code, "academic_year": academic_year},
                {"$set": {"report_paths.excel": excel_path}}
            )

    if not excel_path or not os.path.exists(excel_path):
        os.makedirs(settings.output_dir, exist_ok=True)
        safe_code  = course_code.replace("/", "_")
        safe_year  = academic_year.replace("-", "_")
        excel_path = os.path.join(settings.output_dir, f"{safe_code}_{safe_year}_report.xlsx")
        try:
            attainment_data = doc.get("attainment_data") or {}
            if not attainment_data:
                raise HTTPException(500, "Stored attainment record is missing attainment_data.")
            _generate_excel_with_fallback(attainment_data, excel_path)
        except Exception as e:
            raise HTTPException(500, f"Excel regeneration failed: {e}")
        await attainment_col().update_one(
            {"course_code": course_code, "academic_year": academic_year},
            {"$set": {"report_paths.excel": excel_path}}
        )

    return FileResponse(
        excel_path,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        filename=f"OBE_Attainment_{course_code}_{academic_year}.xlsx"
    )


# ════════════════════════════════════════════════════════════════════════════
# GET /attainment/history
# ════════════════════════════════════════════════════════════════════════════
@router.get("/history", summary="List all stored attainment records")
async def list_attainment_history():
    """Get a list of all courses with stored attainment data."""
    cursor = attainment_col().find({}, {"attainment_data": 0})
    records = []
    async for doc in cursor:
        doc.pop("_id", None)
        records.append({
            "course_code":   doc.get("course_code"),
            "course_name":   doc.get("course_name"),
            "academic_year": doc.get("academic_year"),
            "session_id":    doc.get("session_id"),
            "created_at":    doc.get("created_at"),
            "pdf_url":       f"/attainment/download/pdf/{doc['course_code']}/{doc['academic_year']}",
            "excel_url":     f"/attainment/download/excel/{doc['course_code']}/{doc['academic_year']}",
        })
    return {"records": records, "count": len(records)}


# ════════════════════════════════════════════════════════════════════════════
# GET /attainment/{course_code}/{academic_year}
# ════════════════════════════════════════════════════════════════════════════
@router.get("/{course_code}/{academic_year}", response_model=AttainmentResponse,
            summary="Get attainment data as JSON")
async def get_attainment_json(course_code: str, academic_year: str):
    """Retrieve full attainment data as JSON from MongoDB."""
    doc = await attainment_col().find_one(
        {"course_code": course_code, "academic_year": academic_year}
    )
    if not doc:
        raise HTTPException(404, f"No attainment data for {course_code} / {academic_year}.")
    return _doc_to_attainment_response(doc)
