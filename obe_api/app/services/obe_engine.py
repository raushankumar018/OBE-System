"""
obe_engine.py
─────────────
All AI / computation logic ported from the Jupyter notebook.
Pure functions — no FastAPI dependencies here.
"""

import re
import json
import textwrap
import warnings
from typing import Dict, List, Optional, Tuple
from collections import Counter

import numpy as np
import pandas as pd
import pdfplumber
from docx import Document as DocxDocument
from groq import Groq

try:
    from sentence_transformers import SentenceTransformer
except ImportError:
    SentenceTransformer = None

warnings.filterwarnings("ignore")

# ── Lazy-loaded singletons ──────────────────────────────────────────────────
_groq_client: Optional[Groq] = None
_embed_model: Optional[SentenceTransformer] = None


def get_groq(api_key: str, model: str) -> Groq:
    global _groq_client
    if _groq_client is None:
        _groq_client = Groq(api_key=api_key)
    return _groq_client


def get_embed_model() -> SentenceTransformer:
    global _embed_model
    if _embed_model is None:
        if SentenceTransformer is None:
            return None
        _embed_model = SentenceTransformer("sentence-transformers/all-mpnet-base-v2")
    return _embed_model


def _tokenize(text: str) -> List[str]:
    return re.findall(r"[a-z0-9]+", text.lower())


def encode_texts(texts: List[str]) -> np.ndarray:
    model = get_embed_model()
    if model is not None:
        return model.encode(texts, normalize_embeddings=True, show_progress_bar=False)

    # Fallback for Python 3.13 environments where sentence-transformers is unavailable.
    dim = 512
    vectors = np.zeros((len(texts), dim), dtype=float)
    for row, text in enumerate(texts):
        counts = Counter(_tokenize(text))
        for token, count in counts.items():
            vectors[row, hash(token) % dim] += float(count)
    norms = np.linalg.norm(vectors, axis=1, keepdims=True)
    norms[norms == 0] = 1.0
    return vectors / norms


def cosine_similarity(a: np.ndarray, b: np.ndarray) -> np.ndarray:
    return a @ b.T


def build_fallback_mapping(candidate_pos: List[str], all_psos: List[str]) -> Dict[str, Dict[str, int]]:
    """Deterministic fallback used when the LLM is unavailable or rate-limited."""
    return {
        "PO": {p: (3 if idx == 0 else 2) for idx, p in enumerate(candidate_pos[:3])},
        "PSO": {all_psos[0]: 2} if all_psos else {},
    }


# ════════════════════════════════════════════════════════════════════════════
# CONSTANTS
# ════════════════════════════════════════════════════════════════════════════

STANDARD_POS = {
    "PO1":  "Engineering Knowledge — Apply knowledge of mathematics, science and engineering fundamentals.",
    "PO2":  "Problem Analysis — Identify, formulate and analyze complex engineering problems.",
    "PO3":  "Design/Development — Design solutions for complex engineering problems.",
    "PO4":  "Conduct Investigations — Use research-based methods to investigate complex problems.",
    "PO5":  "Modern Tool Usage — Select and apply appropriate modern engineering tools.",
    "PO6":  "Engineer and Society — Apply contextual knowledge to assess societal impact.",
    "PO7":  "Environment and Sustainability — Understand the impact of engineering solutions.",
    "PO8":  "Ethics — Apply ethical principles and commit to professional responsibilities.",
    "PO9":  "Individual and Team Work — Function effectively as individual and team member.",
    "PO10": "Communication — Communicate effectively on complex engineering activities.",
    "PO11": "Project Management — Demonstrate knowledge of engineering management principles.",
    "PO12": "Life-long Learning — Recognize the need for independent and life-long learning.",
}

BLOOM_LEVELS = ["Remember", "Understand", "Apply", "Analyze", "Evaluate", "Create"]

BLOOM_VERB_MAP = {
    "remember":"Remember","list":"Remember","define":"Remember","state":"Remember",
    "name":"Remember","recall":"Remember","identify":"Remember","enumerate":"Remember",
    "understand":"Understand","describe":"Understand","explain":"Understand",
    "discuss":"Understand","summarize":"Understand","interpret":"Understand",
    "recognize":"Understand","illustrate":"Understand","classify":"Understand",
    "apply":"Apply","use":"Apply","implement":"Apply","demonstrate":"Apply",
    "solve":"Apply","compute":"Apply","calculate":"Apply","show":"Apply","employ":"Apply",
    "analyze":"Analyze","analyse":"Analyze","compare":"Analyze","examine":"Analyze",
    "differentiate":"Analyze","investigate":"Analyze","distinguish":"Analyze",
    "contrast":"Analyze","relate":"Analyze","categorize":"Analyze",
    "evaluate":"Evaluate","assess":"Evaluate","justify":"Evaluate","critique":"Evaluate",
    "appraise":"Evaluate","validate":"Evaluate","select":"Evaluate","judge":"Evaluate",
    "rank":"Evaluate","measure":"Evaluate","test":"Evaluate","choose":"Evaluate",
    "create":"Create","develop":"Create","design":"Create","formulate":"Create",
    "generate":"Create","produce":"Create","construct":"Create","build":"Create",
    "synthesize":"Create","integrate":"Create","compose":"Create","plan":"Create",
}

STRENGTH_LABELS  = {3: "High", 2: "Moderate", 1: "Low", 0: "--"}
STRENGTH_WEIGHTS = {3: 1.0,    2: 0.67,       1: 0.33,  0: 0.0}
ATTAINMENT_THRESHOLDS = {1: (0, 40), 2: (40, 60), 3: (60, 101)}


# ════════════════════════════════════════════════════════════════════════════
# UTILITY FUNCTIONS
# ════════════════════════════════════════════════════════════════════════════

def detect_bloom(text: str) -> str:
    for word in re.findall(r"[a-z]+", text.lower())[:5]:
        if word in BLOOM_VERB_MAP:
            return BLOOM_VERB_MAP[word]
    return "Understand"


def attainment_level(pct: float) -> int:
    for lvl, (lo, hi) in ATTAINMENT_THRESHOLDS.items():
        if lo <= pct < hi:
            return lvl
    return 3


def grade(pct: float) -> str:
    if pct >= 90: return "O"
    if pct >= 80: return "A+"
    if pct >= 70: return "A"
    if pct >= 60: return "B+"
    if pct >= 50: return "B"
    return "F"


def parse_json_safe(text: str) -> Optional[dict]:
    text = re.sub(r"```json\s*", "", text, flags=re.MULTILINE)
    text = re.sub(r"```\s*", "", text, flags=re.MULTILINE)
    text = text.strip()
    try:
        return json.loads(text)
    except Exception:
        pass
    s = text.find("{"); e = text.rfind("}") + 1
    if s != -1 and e > s:
        try:
            return json.loads(text[s:e])
        except Exception:
            pass
    return None


def llm_call(system: str, user: str, api_key: str, model: str,
             temperature: float = 0.05, max_tokens: int = 2000) -> str:
    client = get_groq(api_key, model)
    for attempt in range(3):
        try:
            resp = client.chat.completions.create(
                model=model,
                messages=[{"role": "system", "content": system},
                          {"role": "user", "content": user}],
                temperature=temperature,
                max_tokens=max_tokens,
            )
            return resp.choices[0].message.content.strip()
        except Exception as e:
            if attempt == 2:
                raise
    return ""


# ════════════════════════════════════════════════════════════════════════════
# DOCUMENT PARSING
# ════════════════════════════════════════════════════════════════════════════

def extract_text_from_pdf(path: str) -> str:
    text = ""
    try:
        with pdfplumber.open(path) as pdf:
            for page in pdf.pages:
                t = page.extract_text()
                if t:
                    text += t + "\n"
                else:
                    words = page.extract_words()
                    if words:
                        text += " ".join(w["text"] for w in words) + "\n"
        text = re.sub(r"\(cid:\d+\)", " ", text)
        text = re.sub(r"[ \t]{2,}", " ", text)
        text = re.sub(r"\n{3,}", "\n\n", text)
        return text.strip()
    except Exception as e:
        raise ValueError(f"PDF extraction failed: {e}")


def extract_text_from_docx(path: str) -> str:
    try:
        doc = DocxDocument(path)
        paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
        return "\n".join(paragraphs)
    except Exception as e:
        raise ValueError(f"DOCX extraction failed: {e}")


def extract_text_from_file(path: str, filename: str) -> str:
    ext = filename.lower().rsplit(".", 1)[-1]
    if ext == "pdf":
        return extract_text_from_pdf(path)
    elif ext in ("docx", "doc"):
        return extract_text_from_docx(path)
    elif ext == "txt":
        with open(path, "r", encoding="utf-8", errors="replace") as f:
            return f.read()
    else:
        raise ValueError(f"Unsupported file type: {ext}. Use PDF, DOCX, or TXT.")


def extract_marks_from_excel(path: str) -> pd.DataFrame:
    """
    Load student marks from Excel.
    Expected columns: Roll_No, Question_ID, Marks_Obtained
    Optional: Max_Marks, Mapped_CO, Exam, Module
    """
    try:
        required = {"Roll_No", "Question_ID", "Marks_Obtained"}
        sheets = pd.read_excel(path, sheet_name=None)
        df = None

        for sheet_name, sheet_df in sheets.items():
            sheet_df.columns = [str(col).strip() for col in sheet_df.columns]
            if required.issubset(set(sheet_df.columns)):
                df = sheet_df
                break

        if df is None:
            available = {
                name: [str(col).strip() for col in sheet_df.columns]
                for name, sheet_df in sheets.items()
            }
            raise ValueError(
                f"No sheet contains required columns: {sorted(required)}. "
                f"Available sheets/columns: {available}"
            )

        missing = required - set(df.columns)
        if missing:
            raise ValueError(f"Excel missing columns: {missing}. "
                             f"Required: Roll_No, Question_ID, Marks_Obtained")
        return df
    except Exception as e:
        raise ValueError(f"Excel read failed: {e}")


# ════════════════════════════════════════════════════════════════════════════
# SYLLABUS PARSING
# ════════════════════════════════════════════════════════════════════════════

def parse_pos(text: str, standard_pos: Dict) -> Dict[str, str]:
    result = {}
    for pat in [r"(PO\s*\d{1,2})\s*[:\-–]\s*([A-Za-z][^\n\r]{5,120})",
                r"(PO\s*\d{1,2})\s+([A-Z][a-z][^\n]{5,100})"]:
        for pid, desc in re.findall(pat, text, re.IGNORECASE):
            key = re.sub(r"\s+", "", pid).upper()
            if key not in result:
                result[key] = desc.strip().rstrip(".")
    for k, v in standard_pos.items():
        if k not in result:
            result[k] = v
    return dict(sorted(result.items(), key=lambda x: int(re.search(r"\d+", x[0]).group())))


def parse_psos(text: str) -> Dict[str, str]:
    result = {}
    for pat in [r"(PSO\s*\d+)\s*[:\-–]\s*([A-Za-z][^\n\r]{5,120})",
                r"(PSO\s*\d+)\s+([A-Za-z][^\n]{5,100})"]:
        for pid, desc in re.findall(pat, text, re.IGNORECASE):
            key = re.sub(r"\s+", "", pid).upper()
            if key not in result:
                result[key] = desc.strip().rstrip(".")
    if not result:
        result = {
            "PSO1": "Apply domain-specific principles to design, develop and deploy scalable solutions.",
            "PSO2": "Use modern software tools, frameworks and methods to build real-world systems.",
        }
    return dict(sorted(result.items()))


def parse_units(text: str) -> List[Dict]:
    matches = re.findall(
        r"UNIT\s+(\d+)[:\s\-–]*(.*?)(?=UNIT\s*\d+[:\s\-–]|\Z)",
        text, re.DOTALL | re.IGNORECASE
    )
    units = []
    for num, body in matches:
        clean = re.sub(r"\s+", " ", body).strip()
        if len(clean) > 20:
            units.append({"unit_no": int(num), "content": clean})
    return sorted(units, key=lambda x: x["unit_no"])


# ════════════════════════════════════════════════════════════════════════════
# SYLLABUS INTELLIGENCE
# ════════════════════════════════════════════════════════════════════════════

def bloom_for_unit(unit_no: int, total: int) -> Tuple[str, str]:
    mapping = {
        4: ["Apply", "Analyze", "Evaluate", "Create"],
        5: ["Apply", "Apply", "Analyze", "Evaluate", "Create"],
        6: ["Apply", "Apply", "Analyze", "Analyze", "Evaluate", "Create"],
    }
    seq = mapping.get(total, ["Apply", "Analyze", "Evaluate", "Create"])
    level = seq[min(unit_no - 1, len(seq) - 1)]
    verb_map = {"Apply": "Apply", "Analyze": "Analyze", "Evaluate": "Evaluate",
                "Create": "Design", "Remember": "Recall", "Understand": "Explain"}
    return level, verb_map.get(level, level)


def analyze_syllabus(syllabus_text: str, units_raw: List[Dict],
                     course_code: str, course_name: str, department: str,
                     degree: str, api_key: str, model: str) -> Dict:
    units_text = "\n\n".join(f"UNIT {u['unit_no']}: {u['content']}" for u in units_raw)
    total = len(units_raw)
    hints = "".join(
        f"  Unit {u['unit_no']}: bloom='{bloom_for_unit(u['unit_no'], total)[0]}', "
        f"verb='{bloom_for_unit(u['unit_no'], total)[1]}'\n"
        for u in units_raw
    )
    prompt = (
        f"OBE curriculum expert for {degree} programs.\n"
        f"Analyze: {course_code} - {course_name}, {department}.\n\n"
        f"MANDATORY BLOOM ASSIGNMENTS:\n{hints}\n"
        "For each unit provide: unit_title, key_topics(3-5), key_skills(3), "
        "bloom_level(exact), bloom_verb(exact), co_focus(15-20 words starts with verb).\n\n"
        "CO FOCUS: broad category names ONLY.\n"
        "  GOOD: 'various regression and classification models'\n"
        "  BAD:  'linear regression, logistic regression, SVM'\n\n"
        "Return ONLY valid JSON:\n"
        '{"subject_nature":"mixed","subject_summary":"...","core_themes":[...],'
        '"units":[{"unit_no":1,"unit_title":"...","key_topics":[...],'
        '"key_skills":[...],"bloom_level":"Apply","bloom_verb":"Apply",'
        '"co_focus":"Apply ..."}]}\n\n'
        f"SYLLABUS:\n{syllabus_text}\n\nUNITS:\n{units_text}"
    )
    raw = llm_call("Curriculum analyst. Return ONLY valid JSON.", prompt,
                   api_key, model, max_tokens=3000)
    result = parse_json_safe(raw)
    if result:
        return result

    # Fallback
    fb_bloom = ["Apply", "Analyze", "Evaluate", "Create", "Evaluate", "Analyze"]
    fb_verb  = ["Apply", "Analyze", "Evaluate", "Design", "Evaluate", "Analyze"]
    return {
        "subject_nature": "mixed",
        "subject_summary": f"{course_name} covers theoretical and practical aspects.",
        "core_themes": ["core concepts", "methods", "applications"],
        "units": [{"unit_no": u["unit_no"], "unit_title": f"Unit {u['unit_no']}",
                   "key_topics": [], "key_skills": [],
                   "bloom_level": fb_bloom[(u["unit_no"] - 1) % len(fb_bloom)],
                   "bloom_verb": fb_verb[(u["unit_no"] - 1) % len(fb_verb)],
                   "co_focus": u["content"][:80]} for u in units_raw]
    }


# ════════════════════════════════════════════════════════════════════════════
# CO GENERATION  (iterative refinement loop)
# ════════════════════════════════════════════════════════════════════════════

import re
from typing import Dict, List, Optional


# ─────────────────────────────────────────────────────────────
# STAGE 1: RAW CO GENERATION (Synced with Notebook Prompt)
# ─────────────────────────────────────────────────────────────
# ════════════════════════════════════════════════════════════════════════════
# CO GENERATION ENGINE (SYNCED WITH NOTEBOOK PIPELINE)
# ════════════════════════════════════════════════════════════════════════════

def _generate_course_outcomes_raw(
    syllabus_analysis: Dict, po_dict: Dict, pso_dict: Dict, 
    syllabus_text: str, num_cos: int, course_code: str, 
    course_name: str, department: str, degree: str,
    api_key: str, model: str, feedback: Optional[str] = None,
    current_cos: Optional[List[Dict]] = None
) -> str:

    po_text = "\n".join(f"{k}: {v}" for k, v in po_dict.items())
    pso_text = "\n".join(f"{k}: {v}" for k, v in pso_dict.items())
    units = syllabus_analysis.get("units", [])

    co_instructions = []
    bloom_summary = []

    for u in units[:num_cos]:
        n = u["unit_no"]
        topics = u.get("key_topics", [])[:4]
        verb = u.get("bloom_verb", "Apply")
        bloom = u.get("bloom_level", "Apply")
        focus = u.get("co_focus", "")

        bloom_summary.append(f"CO{n}={bloom}(verb={verb})")

        co_instructions.append(
            f"CO{n}: First word MUST be '{verb}'. Bloom={bloom}.\n"
            f"      Unit topics: {', '.join(str(t) for t in topics)}.\n"
            f"      Focus: {focus}"
        )

    current_cos_text = ""
    if current_cos:
        current_cos_lines = []
        for co in current_cos:
            current_cos_lines.append(
                f"{co.get('co_id', 'CO?')}: {co.get('co_text', '')} "
                f"[{', '.join(co.get('po_mapping', []))}] "
                f"{{{', '.join(co.get('pso_mapping', []))}}}"
            )
        current_cos_text = "\nCURRENT COs TO REVISE:\n" + "\n".join(current_cos_lines)

    feedback_block = ""
    if feedback:
        feedback_block = (
            "\nUSER FEEDBACK TO APPLY (HIGHEST PRIORITY):\n"
            f"{feedback}\n"
            "You must revise the COs so this feedback is clearly reflected.\n"
            "Do not ignore requested topic shifts, specificity changes, or corrections.\n"
        )

    prompt = f"""You are a senior OBE curriculum designer for {degree} programs.
Write Course Outcomes for: {course_code} - {course_name}, {degree}, {department}.

MANDATORY BLOOM DISTRIBUTION: {", ".join(bloom_summary)}
STRICTLY USE THESE EXACT VERBS AS FIRST WORD OF EACH CO.

PER-CO INSTRUCTIONS:
{chr(10).join(co_instructions)}

CO LANGUAGE RULES (CRITICAL):
1. First word = EXACT assigned Bloom verb (non-negotiable).
2. Use BROAD category terms, NOT itemized lists.
   GOOD: "various regression and ensemble learning models"
   BAD:  "linear regression, SVM, KNN, decision trees"
3. Length: 15-22 words per CO statement.
4. Describes ABILITY (what student can do), not content list.
5. Course subject ({course_name}) must be recognizable from the CO alone.
6. After the CO text, append: [PO_IDs] {{PSO_IDs}}
   - Select 2-4 most relevant POs per CO
   - Select 1-2 most relevant PSOs per CO
7. If user feedback is provided, treat it as a required revision request.
8. When revising current COs, preserve what is already good and only change what the feedback asks to improve.

STYLE (match this quality):
CO1: Apply a wide variety of machine learning algorithms for real-world prediction tasks. [PO1, PO2] {{PSO1}}

OUTPUT FORMAT (STRICT):
CO1: <statement> [PO_IDs] {{PSO_IDs}}
CO2: ...

OUTPUT: CO lines ONLY. No explanations.

PROGRAM OUTCOMES:
{po_text}

PROGRAM SPECIFIC OUTCOMES:
{pso_text}

{feedback_block}
{current_cos_text}

SYLLABUS (Context):
{syllabus_text[:3000]}
"""

    return llm_call(
        "OBE expert. Follow Bloom verb assignments exactly. Use broad language. Output CO lines only.",
        prompt,
        api_key,
        model,
        temperature=0.05,
        max_tokens=1000
    )


def _refine_cos_professional(raw_co_text: str, api_key: str, model: str) -> str:
    """Stage 2: Refine raw COs into professional two-line university-level statements."""
    prompt = f"""You are an academic curriculum designer.
Rewrite these Course Outcomes into professional university-level statements.

RULES:
1. Each CO = EXACTLY TWO LINES (main action + application context)
2. First word = same Bloom verb as in original (DO NOT change)
3. Use moderate specificity: focus on what student CAN DO.
4. REMOVE the [PO] {{PSO}} tags from the output.
5. Professional, clear academic English.

OUTPUT FORMAT:
CO1:
<line 1 — main action>
<line 2 — application/context>

CO2:
...

DO NOT write any explanation.
RAW COs:
{raw_co_text}"""

    return llm_call("Academic CO rewriting expert. Two-line format.", 
                    prompt, api_key, model, temperature=0.2)


def _fix_bloom_mismatch(co_text: str, expected_verb: str, expected_bloom: str, api_key: str, model: str) -> str:
    """Stage 4 (Fallback): Auto-fix COs that fail the Bloom/Length validation."""
    prompt = (
        f"Rewrite this Course Outcome so it starts with '{expected_verb}' (Bloom: {expected_bloom}).\n"
        "Rules: keep broad language (NO specific algorithm names), 15-22 words, professional.\n"
        f"Current CO: {co_text}\n"
        "Output ONLY the rewritten CO text (no labels)."
    )
    try:
        result = llm_call("Fix Bloom verb. Return only CO text.", prompt, api_key, model, max_tokens=150)
        return re.sub(r"^CO\d+\s*:\s*", "", result).strip()
    except Exception:
        words = co_text.split()
        return expected_verb + " " + " ".join(words[1:]) if words else co_text


def _normalize_co_text(text: str) -> str:
    return re.sub(r"\s+", " ", str(text or "").strip()).lower()


def _rewrite_cos_from_feedback(
    current_cos: List[Dict], feedback: str, course_name: str,
    api_key: str, model: str
) -> Dict[str, str]:
    current_lines = []
    for co in current_cos:
        current_lines.append(
            f"{co.get('co_id', 'CO?')}: {co.get('co_text', '')} "
            f"(Bloom: {co.get('bloom_level', 'Apply')})"
        )

    prompt = f"""You are revising Course Outcomes using faculty feedback.

COURSE: {course_name}

CURRENT COs:
{chr(10).join(current_lines)}

FACULTY FEEDBACK:
{feedback}

TASK:
Rewrite every CO so the feedback is clearly applied.
Each CO must be meaningfully different from its current version.
Preserve the same CO IDs.
Preserve the same Bloom verb at the start unless the feedback explicitly requires otherwise.
Keep each CO professional and 15-22 words.

Return ONLY valid JSON in this format:
{{"CO1":"...", "CO2":"...", "CO3":"...", "CO4":"..."}}
"""
    raw = llm_call(
        "Revise COs using faculty feedback. Return JSON only.",
        prompt,
        api_key,
        model,
        temperature=0.2,
        max_tokens=800,
    )
    parsed = parse_json_safe(raw)
    return parsed if isinstance(parsed, dict) else {}


def generate_and_validate_cos(
    syllabus_text: str, syllabus_analysis: Dict, po_dict: Dict, pso_dict: Dict,
    num_cos: int, course_code: str, course_name: str, department: str,
    degree: str, api_key: str, model: str, feedback: Optional[str] = None,
    current_cos: Optional[List[Dict]] = None
) -> List[Dict]:
    """
    The COMPLETE Main Pipeline.
    Steps: 1. Generate Raw -> 2. Refine 2-Line -> 3. Parse -> 4. Bloom Validate & Fix
    """
    
    # 1. Generate Raw COs (with tags)
    raw_output = _generate_course_outcomes_raw(
        syllabus_analysis, po_dict, pso_dict, syllabus_text, 
        num_cos, course_code, course_name, department, degree, api_key, model,
        feedback=feedback, current_cos=current_cos
    )

    # 2. Refine to professional 2-line format (removes tags)
    refined_output = _refine_cos_professional(raw_output, api_key, model)

    # 3. Parse and match mappings from Raw to the Refined text
    # This uses the logic from parse_cos_from_output in your notebook
    initial_cos = _parse_cos_logic(raw_output, refined_output, syllabus_analysis, num_cos)

    # 4. Bloom's validation & auto-fix loop
    final_cos = []
    for co in initial_cos:
        text = co["co_text"]
        detected = detect_bloom(text)
        expected = co["bloom_expected"]
        verb = co["bloom_verb"]
        too_short = len(text.split()) < 15

        if detected != expected or too_short:
            # Auto-fix using LLM
            text = _fix_bloom_mismatch(text, verb, expected, api_key, model)
            detected = detect_bloom(text)

        co["co_text"] = text
        co["bloom_level"] = detected
        # Remove internal helper keys before returning to frontend
        final_cos.append({
            "co_id": co["co_id"],
            "unit_no": co["unit_no"],
            "co_text": text,
            "bloom_level": detected,
            "po_mapping": co["po_mapping"],
            "pso_mapping": co["pso_mapping"]
        })

    if feedback and current_cos:
        current_map = {
            co.get("co_id"): _normalize_co_text(co.get("co_text", ""))
            for co in current_cos
        }
        changed_count = sum(
            1 for co in final_cos
            if _normalize_co_text(co["co_text"]) != current_map.get(co["co_id"], "")
        )

        if changed_count == 0:
            forced = _rewrite_cos_from_feedback(current_cos, feedback, course_name, api_key, model)
            if forced:
                for co in final_cos:
                    rewritten = forced.get(co["co_id"])
                    if rewritten:
                        old_co = next(
                            (old for old in current_cos if old.get("co_id") == co["co_id"]),
                            {}
                        )
                        expected = next(
                            (old.get("bloom_level", co["bloom_level"]) for old in current_cos
                             if old.get("co_id") == co["co_id"]),
                            co["bloom_level"]
                        )
                        expected_verb = str(old_co.get("co_text", "")).split()[0] if old_co.get("co_text") else co["bloom_level"]
                        text = rewritten.strip()
                        detected = detect_bloom(text)
                        if detected != expected or len(text.split()) < 15:
                            text = _fix_bloom_mismatch(text, expected_verb, expected, api_key, model)
                            detected = detect_bloom(text)
                        co["co_text"] = text
                        co["bloom_level"] = detected

    return final_cos


def _parse_cos_logic(raw_output: str, refined_output: str, syllabus_analysis: Dict, num_cos: int) -> List[Dict]:
    """Helper to merge the Mappings from Raw Output with the Text from Refined Output."""
    raw_records = {}
    for line in raw_output.splitlines():
        m = re.match(r"(CO\d+)\s*:\s*(.*)", line.strip())
        if not m: continue
        co_id = m.group(1)
        rest = m.group(2)
        po_m = re.findall(r"\[([^\]]+)\]", rest)
        pso_m = re.findall(r"\{([^\}]+)\}", rest)
        
        po_list = [p.strip() for p in po_m[0].split(",")] if po_m else []
        pso_list = [p.strip() for p in pso_m[0].split(",")] if pso_m else []
        
        raw_records[co_id] = {
            "po_mapping": [p for p in po_list if re.match(r"PO\d+$", p)],
            "pso_mapping": [p for p in pso_list if re.match(r"PSO\d+$", p)]
        }

    refined_text_map = {}
    current_co, lines = None, []
    for line in refined_output.splitlines():
        line = line.strip()
        if re.match(r"CO\d+\s*:", line):
            if current_co: refined_text_map[current_co] = " ".join(lines).strip()
            current_co = re.findall(r"CO\d+", line)[0]
            lines = []
        elif line and current_co:
            lines.append(line)
    if current_co: refined_text_map[current_co] = " ".join(lines).strip()

    units_info = {u["unit_no"]: u for u in syllabus_analysis.get("units", [])}
    
    merged = []
    for i in range(1, num_cos + 1):
        cid = f"CO{i}"
        u = units_info.get(i, {})
        merged.append({
            "co_id": cid,
            "unit_no": i,
            "co_text": refined_text_map.get(cid, u.get("co_focus", "")),
            "bloom_expected": u.get("bloom_level", "Apply"),
            "bloom_verb": u.get("bloom_verb", "Apply"),
            "po_mapping": raw_records.get(cid, {}).get("po_mapping", ["PO1", "PO2"]),
            "pso_mapping": raw_records.get(cid, {}).get("pso_mapping", ["PSO1"])
        })
    return merged

# ─────────────────────────────────────────────────────────────
# FIX BLOOM MISMATCH
# ─────────────────────────────────────────────────────────────
def _fix_bloom(text: str, verb: str, bloom: str, api_key: str, model: str) -> str:
    try:
        result = llm_call(
            "Fix Bloom verb. Return only CO text.",
            f"Rewrite starting with '{verb}' (Bloom:{bloom}). Broad language. 15-22 words.\nCO: {text}",
            api_key,
            model,
            max_tokens=150,
        )
        return re.sub(r"^CO\d+\s*:\s*", "", result).strip()
    except:
        words = text.split()
        return verb + " " + " ".join(words[1:]) if words else text


# ─────────────────────────────────────────────────────────────
# MAIN PIPELINE
# ─────────────────────────────────────────────────────────────
# ════════════════════════════════════════════════════════════════════════════
# CO-PO-PSO MAPPING
# ════════════════════════════════════════════════════════════════════════════

ALL_POS = [f"PO{i}" for i in range(1, 13)]


def build_co_po_matrix(cos: List[Dict], po_dict: Dict, pso_dict: Dict,
                        api_key: str, model: str) -> Tuple[Dict, Dict]:
    """
    Hybrid mapping: Semantic + LLM + NBA compliance.
    Returns (matrix_label, matrix_numeric) as dicts {CO_ID: {PO_ID: label/score}}
    """
    all_psos = list(pso_dict.keys())
    all_cols = ALL_POS + all_psos

    co_texts  = [c["co_text"] for c in cos]
    po_descs  = [po_dict.get(p, p) for p in ALL_POS]
    pso_descs = [pso_dict.get(p, p) for p in all_psos]

    q_emb   = encode_texts(co_texts)
    po_emb  = encode_texts(po_descs)
    pso_emb = encode_texts(pso_descs) if pso_descs else np.zeros((len(co_texts), 0), dtype=float)
    po_sims  = cosine_similarity(q_emb, po_emb)

    matrix_num   = {c["co_id"]: {col: 0 for col in all_cols} for c in cos}
    matrix_label = {c["co_id"]: {col: "--" for col in all_cols} for c in cos}

    for i, co in enumerate(cos):
        co_id = co["co_id"]
        top6_idx      = np.argsort(po_sims[i])[::-1][:6]
        candidate_pos = [ALL_POS[j] for j in top6_idx]

        po_desc_txt  = "\n".join(f"{p}: {po_dict.get(p,'')}" for p in candidate_pos)
        pso_desc_txt = "\n".join(f"{p}: {pso_dict.get(p,'')}" for p in all_psos)

        prompt = (
            f"NBA accreditation expert assigning CO-PO mapping strengths.\n\n"
            f"CO {co_id}: \"{co['co_text']}\"\n\n"
            "STRENGTH SCALE: 3=High, 2=Moderate, 1=Low, 0=None\n"
            "NBA RULES: max 4 POs non-zero; min 2 POs with score>=2; max 2 PSOs.\n\n"
            f"CANDIDATE POs:\n{po_desc_txt}\n\n"
            f"ALL PSOs:\n{pso_desc_txt}\n\n"
            'Return ONLY valid JSON: {"PO": {"PO1":0,...}, "PSO": {"PSO1":0,...}}'
        )
        try:
            raw = llm_call("NBA OBE expert. Return only valid JSON.", prompt,
                           api_key, model, max_tokens=400)
            result = parse_json_safe(raw)
        except Exception:
            result = None
        if not result:
            result = build_fallback_mapping(candidate_pos, all_psos)

        po_scores  = {k: int(v) for k, v in result.get("PO",  {}).items()
                      if isinstance(v, (int, float)) and int(v) > 0}
        pso_scores = {k: int(v) for k, v in result.get("PSO", {}).items()
                      if isinstance(v, (int, float)) and int(v) > 0}
        po_scores  = dict(sorted(po_scores.items(),  key=lambda x: -x[1])[:4])
        pso_scores = dict(sorted(pso_scores.items(), key=lambda x: -x[1])[:2])

        for po,  sc in po_scores.items():
            if po in ALL_POS:
                matrix_num[co_id][po]   = sc
                matrix_label[co_id][po] = STRENGTH_LABELS[sc]
        for pso, sc in pso_scores.items():
            if pso in all_psos:
                matrix_num[co_id][pso]   = sc
                matrix_label[co_id][pso] = STRENGTH_LABELS[sc]

        # NBA compliance: ensure >= 2 PO mappings
        non_zero = sum(1 for p in ALL_POS if matrix_num[co_id][p] > 0)
        if non_zero < 2:
            top2 = [ALL_POS[j] for j in np.argsort(po_sims[i])[::-1][:2]]
            for p in top2:
                if matrix_num[co_id][p] < 2:
                    matrix_num[co_id][p]   = 2
                    matrix_label[co_id][p] = STRENGTH_LABELS[2]

    return matrix_label, matrix_num


# ════════════════════════════════════════════════════════════════════════════
# QUESTION BANK BUILDER
# ════════════════════════════════════════════════════════════════════════════

def build_question_bank(cfg: Dict) -> pd.DataFrame:
    """Build complete question bank from exam structure config dict."""
    records = []

    def add_q(exam, module, qid, component, max_marks, bloom, difficulty, is_mb=False):
        records.append({
            "Exam": exam, "Module": module, "Question_ID": qid,
            "Component": component, "Max_Marks": float(max_marks),
            "Bloom_Level": bloom, "Difficulty": difficulty,
            "Is_ModuleBank": is_mb, "Mapped_CO": None,
        })

    for mod in range(1, cfg["num_modules"] + 1):
        m = f"M{mod}"

        # T1 Part A — Module Bank (10 questions, 3 bits each)
        for q_num in range(1, 11):
            for bit, marks in cfg["t1_parta_bits"].items():
                bloom = "Apply" if bit in ["b", "c"] else "Remember"
                diff  = "Medium" if marks >= 4 else "Easy"
                add_q("T1", mod, f"{m}_MB{q_num}_{bit}",
                      f"ModuleBank-Bit{bit.upper()}", marks, bloom, diff, is_mb=True)

        # T1 Part B
        for bit, marks in cfg["t1_partb_bits"].items():
            bloom = "Apply" if bit in ["b", "c"] else "Understand"
            diff  = "Medium" if marks <= 4 else "Hard"
            add_q("T1", mod, f"{m}_T1B_{bit}", f"PartB-Bit{bit.upper()}", marks, bloom, diff)

        # T2 Viva
        add_q("T2", mod, f"{m}_Viva", "Viva Voce", cfg["t2_max"], "Evaluate", "Hard")

        # T3 Doc+PPT
        add_q("T3", mod, f"{m}_DocPPT", "Document and Presentation", cfg["t3_max"], "Create", "Hard")

        # T4 MCQs
        for n in range(1, cfg["t4_mcq_count"] + 1):
            add_q("T4", mod, f"{m}_MCQ{n}", "MCQ", cfg["t4_mcq_marks"], "Remember", "Easy")

        # T4 Descriptive
        for q_num in range(1, cfg["t4_desc_count"] + 1):
            for bit, marks in cfg["t4_desc_bits"].items():
                bloom = "Analyze" if bit == "c" else "Apply"
                diff  = "Medium" if marks <= 2 else "Hard"
                add_q("T4", mod, f"{m}_T4Q{q_num}_{bit}",
                      f"Desc-Q{q_num}-Bit{bit.upper()}", marks, bloom, diff)

        # T5 CLAs
        for n in range(1, cfg["t5_cla_count"] + 1):
            add_q("T5", mod, f"{m}_CLA{n}", f"CLA Assignment {n}",
                  cfg["t5_cla_marks"], "Create", "Hard")

    # Lab External
    add_q("LAB", 0, "Lab_External", "Lab External Exam", cfg["lab_ext_max"], "Create", "Hard")

    # ETE Part A
    for q_num in range(1, cfg["ete_parta_count"] + 1):
        for bit, marks in cfg["ete_parta_bits"].items():
            bloom = "Apply" if bit == "a" else ("Understand" if bit == "b" else "Analyze")
            add_q("ETE", 0, f"ETE_A{q_num}_{bit}",
                  f"ETE-PartA-Q{q_num}-Bit{bit.upper()}", marks, bloom, "Hard")

    # ETE Part B
    for q_num in range(1, cfg["ete_partb_count"] + 1):
        for bit, marks in cfg["ete_partb_bits"].items():
            bloom = "Evaluate" if bit == "a" else ("Analyze" if bit == "b" else "Create")
            add_q("ETE", 0, f"ETE_B{q_num}_{bit}",
                  f"ETE-PartB-Q{q_num}-Bit{bit.upper()}", marks, bloom, "Hard")

    df = pd.DataFrame(records)
    return df.drop_duplicates(subset=["Question_ID"], keep="first").reset_index(drop=True)


# ════════════════════════════════════════════════════════════════════════════
# QUESTION → CO MAPPING
# ════════════════════════════════════════════════════════════════════════════

def map_questions_to_cos(questions_df: pd.DataFrame, cos: List[Dict],
                          num_cos: int, api_key: str, model: str,
                          question_paper_text: str = "") -> pd.DataFrame:
    co_df  = pd.DataFrame(cos)

    q_parent = questions_df.copy()
    q_parent["Parent_Q"] = q_parent["Question_ID"].str.rsplit("_", n=1).str[0]
    parent_df = (q_parent.groupby("Parent_Q")
                 .agg(Exam=("Exam", "first"), Module=("Module", "first"),
                      Component=("Component", "first"), Max_Marks=("Max_Marks", "sum"),
                      Bloom_Level=("Bloom_Level", "first"))
                 .reset_index())

    co_str = "\n".join(f"{r['co_id']} [{r['bloom_level']}]: {r['co_text']}" for r in cos)
    q_str  = "\n".join(
        f"{r.Parent_Q} [Exam:{r.Exam}|Mod:{r.Module}|{r.Max_Marks:.0f}M]: {r.Component}"
        for r in parent_df.itertuples(index=False)
    )
    paper_context = question_paper_text[:6000].strip()
    prompt = (
        f"Map each exam component to the most appropriate Course Outcome.\n\n"
        f"COURSE OUTCOMES:\n{co_str}\n\n"
        f"QUESTION PAPER TEXT:\n{paper_context or 'No extracted question paper text available.'}\n\n"
        f"EXAM COMPONENTS:\n{q_str}\n\n"
        "RULES:\n"
        f"- Distribute across ALL {num_cos} COs evenly\n"
        "- Use QUESTION PAPER TEXT to infer the topic and Bloom level whenever possible\n"
        "- MCQs → CO1 or CO2\n"
        "- Viva, PPT → higher Bloom COs\n"
        "- ETE Part B → highest Bloom COs\n"
        "- CLA → match by module\n"
        "- Lab External → last CO\n\n"
        'Return ONLY valid JSON: {"Parent_Q_ID": "CO_ID", ...}'
    )
    llm_map = {}
    try:
        raw    = llm_call("Map questions to COs. Return only valid JSON.", prompt,
                          api_key, model, max_tokens=2000)
        result = parse_json_safe(raw)
        if isinstance(result, dict):
            llm_map = result
    except Exception:
        pass

    # Semantic fallback
    unmapped_pids = [r.Parent_Q for r in parent_df.itertuples(index=False)
                     if r.Parent_Q not in llm_map]
    if unmapped_pids:
        sub  = parent_df[parent_df["Parent_Q"].isin(unmapped_pids)]
        sims = cosine_similarity(
            encode_texts(sub["Component"].tolist()),
            encode_texts([c["co_text"] for c in cos])
        )
        for j, pid in enumerate(sub["Parent_Q"]):
            llm_map[pid] = cos[int(np.argmax(sims[j]))]["co_id"]

    result_df = questions_df.copy()
    result_df["Parent_Q"] = result_df["Question_ID"].str.rsplit("_", n=1).str[0]
    result_df["Mapped_CO"] = result_df["Parent_Q"].map(llm_map)

    cos_cycle = [c["co_id"] for c in cos]
    still_none = result_df["Mapped_CO"].isna()
    for k, idx in enumerate(result_df[still_none].index):
        result_df.loc[idx, "Mapped_CO"] = cos_cycle[k % len(cos_cycle)]

    return result_df.drop(columns=["Parent_Q"])


# ════════════════════════════════════════════════════════════════════════════
# ATTAINMENT CALCULATION
# ════════════════════════════════════════════════════════════════════════════

IA_EXAMS  = ["T1", "T2", "T3", "T4", "T5"]
ETE_EXAMS = ["LAB", "ETE"]


def compute_attainment(marks_df: pd.DataFrame, cos: List[Dict],
                        matrix_num: Dict, po_dict: Dict, pso_dict: Dict,
                        cfg: Dict) -> Dict:
    """
    Full attainment computation. Returns structured result dict.
    """
    co_ids = [c["co_id"] for c in cos]
    all_psos = list(pso_dict.keys())
    all_cols = ALL_POS + all_psos

    # Student-level CO attainment
    co_student = (
        marks_df.groupby(["Roll_No", "Mapped_CO"])
        .agg(Obtained=("Marks_Obtained", "sum"), Max=("Max_Marks", "sum"))
        .reset_index()
    )
    co_student["Att_Pct"] = (co_student["Obtained"] / co_student["Max"] * 100).round(2)
    co_student["Level"]   = co_student["Att_Pct"].apply(attainment_level)

    co_cols = sorted(co_ids)
    student_pivot = (
        co_student.pivot(index="Roll_No", columns="Mapped_CO", values="Att_Pct")
        .round(2).reset_index()
    )
    for cid in co_cols:
        if cid not in student_pivot.columns:
            student_pivot[cid] = 0.0
    student_pivot = student_pivot[["Roll_No"] + co_cols]
    student_pivot["Overall_Pct"] = student_pivot[co_cols].mean(axis=1).round(2)
    student_pivot["Grade"]       = student_pivot["Overall_Pct"].apply(grade)

    # Class-level IA and ETE
    def class_co_pct(exam_types):
        sub = marks_df[marks_df["Exam"].isin(exam_types)]
        if sub.empty:
            return {}
        return (sub.groupby("Mapped_CO")
                .apply(lambda d: round(d["Marks_Obtained"].sum() / d["Max_Marks"].sum() * 100, 2))
                .to_dict())

    ia_att  = class_co_pct(IA_EXAMS)
    ete_att = class_co_pct(ETE_EXAMS)

    co_agg = (
        co_student.groupby("Mapped_CO")
        .agg(
            Mean_Pct        =("Att_Pct", "mean"),
            Std_Pct         =("Att_Pct", "std"),
            Students_Level1 =("Level", lambda x: (x == 1).sum()),
            Students_Level2 =("Level", lambda x: (x == 2).sum()),
            Students_Level3 =("Level", lambda x: (x == 3).sum()),
        ).reset_index().rename(columns={"Mapped_CO": "CO_ID"})
    )
    co_agg["Mean_Pct"]    = co_agg["Mean_Pct"].round(2)
    co_agg["Class_Level"] = co_agg["Mean_Pct"].apply(attainment_level)
    co_agg["IA_Pct"]      = co_agg["CO_ID"].map(ia_att).fillna(0).round(2)
    co_agg["ETE_Pct"]     = co_agg["CO_ID"].map(ete_att).fillna(0).round(2)
    co_agg["DA_Pct"]      = (cfg["w_ia"] * co_agg["IA_Pct"] + cfg["w_ete"] * co_agg["ETE_Pct"]).round(2)
    co_agg["DA_Score"]    = (co_agg["DA_Pct"] / 100 * 3).round(2)
    co_agg["IDA_Score"]   = round(cfg["indirect_score"] / 5 * 3, 2)
    co_agg["Final_Score"] = (cfg["w_direct"] * co_agg["DA_Score"] +
                              cfg["w_indirect"] * co_agg["IDA_Score"]).round(2)
    co_agg["Attained"]    = co_agg["Final_Score"].apply(
        lambda x: "Attained" if x >= cfg["target_attainment"] else "Not Attained"
    )

    # Merge CO text
    co_text_map = {c["co_id"]: c["co_text"] for c in cos}
    co_bloom_map = {c["co_id"]: c["bloom_level"] for c in cos}
    co_agg["CO_Text"]    = co_agg["CO_ID"].map(co_text_map)
    co_agg["Bloom_Level"] = co_agg["CO_ID"].map(co_bloom_map)

    # PO/PSO attainment
    co_scores = co_agg.set_index("CO_ID")["Final_Score"].to_dict()

    def compute_po_att(outcome_cols: List[str], outcome_dict: Dict) -> List[Dict]:
        rows = []
        for outcome in outcome_cols:
            w_sum = w_total = 0.0
            contributors = []
            for co_id in co_ids:
                strength = matrix_num.get(co_id, {}).get(outcome, 0)
                if strength > 0:
                    w = STRENGTH_WEIGHTS[strength]
                    w_sum   += co_scores.get(co_id, 0) * w
                    w_total += w
                    contributors.append(f"{co_id}({STRENGTH_LABELS[strength]})")
            score = round(w_sum / w_total, 2) if w_total > 0 else 0.0
            pct   = round(score / 3 * 100, 1)
            rows.append({
                "outcome":        outcome,
                "description":    outcome_dict.get(outcome, "")[:60],
                "score":          score,
                "attainment_pct": pct,
                "level":          attainment_level(pct),
                "contributors":   ", ".join(contributors) or "—",
            })
        return rows

    po_att  = compute_po_att(ALL_POS,    po_dict)
    pso_att = compute_po_att(all_psos,   pso_dict)

    return {
        "co_attainment":  co_agg.to_dict("records"),
        "po_attainment":  [r for r in po_att  if r["score"] > 0],
        "pso_attainment": [r for r in pso_att if r["score"] > 0],
        "student_pivot":  student_pivot.to_dict("records"),
        "co_student":     co_student.to_dict("records"),
    }
