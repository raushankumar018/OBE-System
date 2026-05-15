from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime


# ════════════════════════════════════════════════════════════════════════════
# COURSE / SYLLABUS MODELS
# ════════════════════════════════════════════════════════════════════════════

class CourseMetadata(BaseModel):
    university: str = "Vignan's University"
    department: str = "Computer Science and Engineering"
    degree: str = "B.Tech"
    course_code: str
    course_name: str
    academic_year: str = "2025-26"
    semester: str = "III"
    coordinator: str = ""
    num_students: int = 60
    num_cos_target: int = 4

    # Exam structure
    num_modules: int = 2
    t1_parta_bits: Dict[str, int] = {"a": 2, "b": 4, "c": 4}
    t1_partb_bits: Dict[str, int] = {"a": 2, "b": 4, "c": 4}
    t2_max: int = 5
    t3_max: int = 5
    t4_mcq_count: int = 10
    t4_mcq_marks: float = 0.5
    t4_desc_count: int = 3
    t4_desc_marks: int = 5
    t4_desc_bits: Dict[str, int] = {"a": 2, "b": 2, "c": 1}
    t5_cla_count: int = 4
    t5_cla_marks: int = 20
    lab_ext_max: int = 20
    ete_parta_count: int = 4
    ete_parta_marks: int = 8
    ete_parta_bits: Dict[str, int] = {"a": 3, "b": 3, "c": 2}
    ete_partb_count: int = 2
    ete_partb_marks: int = 14
    ete_partb_bits: Dict[str, int] = {"a": 5, "b": 5, "c": 4}

    # Attainment weights
    w_ia: float = 0.60
    w_ete: float = 0.40
    w_direct: float = 0.80
    w_indirect: float = 0.20
    indirect_score: float = 3.0
    target_attainment: float = 1.67


# ════════════════════════════════════════════════════════════════════════════
# CO GENERATION SESSION MODELS
# ════════════════════════════════════════════════════════════════════════════

class COItem(BaseModel):
    co_id: str                   # "CO1", "CO2" ...
    unit_no: int
    co_text: str
    bloom_level: str
    po_mapping: List[str]
    pso_mapping: List[str]


class COGenerationResponse(BaseModel):
    session_id: str
    course_code: str
    status: str                  # "generated" | "revised" | "confirmed" | "user_provided"
    iteration: int
    cos: List[COItem]
    message: str                 # User-facing message asking for feedback


class COFeedbackRequest(BaseModel):
    session_id: str
    satisfied: bool
    feedback: Optional[str] = None   # What to change if not satisfied
    user_provided_cos: Optional[List[Dict[str, str]]] = None  # fallback: user gives their own COs


class COConfirmRequest(BaseModel):
    session_id: str


# ════════════════════════════════════════════════════════════════════════════
# CO-PO-PSO MAPPING MODELS
# ════════════════════════════════════════════════════════════════════════════

class MappingStrengthCell(BaseModel):
    label: str    # "High" | "Moderate" | "Low" | "--"
    score: int    # 3 | 2 | 1 | 0


class COPOMappingResponse(BaseModel):
    session_id: str
    course_code: str
    cos: List[COItem]
    po_dict: Dict[str, str]
    pso_dict: Dict[str, str]
    matrix_label: Dict[str, Dict[str, str]]   # {CO_ID: {PO_ID: "High"}}
    matrix_numeric: Dict[str, Dict[str, int]] # {CO_ID: {PO_ID: 3}}
    average_po_strength: Dict[str, float]
    message: str


# ════════════════════════════════════════════════════════════════════════════
# MARKS / ATTAINMENT MODELS
# ════════════════════════════════════════════════════════════════════════════

class StudentMarkRow(BaseModel):
    roll_no: str
    question_id: str
    marks_obtained: float
    max_marks: float
    mapped_co: str
    exam: str
    module: int


class COAttainmentRow(BaseModel):
    co_id: str
    co_text: str
    bloom_level: str
    ia_pct: float
    ete_pct: float
    da_score: float
    ida_score: float
    final_score: float
    class_level: int
    attained: str
    students_level1: int
    students_level2: int
    students_level3: int


class POAttainmentRow(BaseModel):
    outcome: str
    description: str
    score: float
    attainment_pct: float
    level: int
    contributors: str


class AttainmentResponse(BaseModel):
    session_id: str
    course_code: str
    academic_year: str
    num_students: int
    co_attainment: List[COAttainmentRow]
    po_attainment: List[POAttainmentRow]
    pso_attainment: List[POAttainmentRow]
    attained_count: int
    total_cos: int
    pdf_download_url: str
    excel_download_url: str
    saved_to_db: bool


class AttainmentDownloadRequest(BaseModel):
    course_code: str
    academic_year: str


# ════════════════════════════════════════════════════════════════════════════
# GENERIC
# ════════════════════════════════════════════════════════════════════════════

class ErrorResponse(BaseModel):
    detail: str
    code: Optional[str] = None
