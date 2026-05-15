# AI-Powered CO-PO-PSO Mapping & Attainment API
**FastAPI Production Backend — Vignan's University OBE System**

---

## Project Structure

```
obe_api/
├── main.py                          ← FastAPI app entry point
├── requirements.txt
├── Dockerfile
├── docker-compose.yml
├── .env.example                     ← Copy to .env and fill in keys
│
├── app/
│   ├── config.py                    ← Settings (reads .env)
│   ├── database.py                  ← MongoDB async connection
│   │
│   ├── models/
│   │   └── schemas.py               ← Pydantic request/response models
│   │
│   ├── services/
│   │   ├── obe_engine.py            ← All AI logic (CO gen, mapping, attainment)
│   │   └── report_service.py        ← PDF + Excel generation
│   │
│   ├── routers/
│   │   ├── router_co.py             ← API 1: CO generation + refinement
│   │   ├── router_mapping.py        ← API 2: CO-PO-PSO mapping
│   │   └── router_attainment.py     ← API 3: Attainment + reports
│   │
│   └── utils/
│       └── marks_template.py        ← Download blank marks Excel template
│
├── uploads/                         ← Temp uploaded files (auto-cleared)
└── outputs/                         ← Generated PDFs, Excels, charts
```

---

## Quick Start

### Option A — Docker (recommended)

```bash
# 1. Clone / unzip
cd obe_api

# 2. Set up environment
cp .env.example .env
# Edit .env → set GROQ_API_KEY

# 3. Start
docker-compose up --build

# API: http://localhost:8000
# Docs: http://localhost:8000/docs
```

### Option B — Local Python

```bash
# 1. Create virtualenv
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate

# 2. Install
pip install -r requirements.txt

# 3. Start MongoDB (must be running on localhost:27017)
# Download: https://www.mongodb.com/try/download/community

# 4. Configure
cp .env.example .env
# Edit .env → set GROQ_API_KEY

# 5. Run
uvicorn main:app --reload --port 8000

# API: http://localhost:8000
# Docs: http://localhost:8000/docs
```

---

## API Workflow

### Step 1 — Generate Course Outcomes

**Upload syllabus and get COs:**
```http
POST /co/generate
Content-Type: multipart/form-data

file: <syllabus.pdf>        ← or use syllabus_text field
course_code: 22CS808
course_name: Machine Learning
department: Computer Science and Engineering
num_cos_target: 4
```

**Response:**
```json
{
  "session_id": "abc123-...",
  "status": "generated",
  "iteration": 1,
  "cos": [
    {
      "co_id": "CO1",
      "co_text": "Apply various machine learning models to solve real-world problems...",
      "bloom_level": "Apply",
      "po_mapping": ["PO1", "PO2"],
      "pso_mapping": ["PSO1"]
    }
  ],
  "message": "COs generated. Are you satisfied? Call /co/feedback"
}
```

**Save the `session_id` — you need it for all subsequent calls.**

---

### Step 2 — Review and Refine COs

**If satisfied:**
```http
POST /co/feedback
Content-Type: application/json

{
  "session_id": "abc123-...",
  "satisfied": true
}
```

**If NOT satisfied (give feedback to regenerate):**
```http
POST /co/feedback
Content-Type: application/json

{
  "session_id": "abc123-...",
  "satisfied": false,
  "feedback": "CO3 should focus on clustering, not classification. CO1 is too generic."
}
```
→ AI regenerates COs addressing your feedback (up to 3 attempts).

**If AI can't satisfy you after 3 attempts, provide your own COs:**
```http
POST /co/feedback
Content-Type: application/json

{
  "session_id": "abc123-...",
  "user_provided_cos": [
    {
      "co_id": "CO1",
      "co_text": "Apply machine learning models to solve real-world problems using various algorithms.",
      "bloom_level": "Apply",
      "po_mapping": ["PO1", "PO2"],
      "pso_mapping": ["PSO1"]
    }
  ]
}
```

---

### Step 3 — CO-PO-PSO Mapping

```http
POST /mapping/generate
Content-Type: application/json

{
  "session_id": "abc123-..."
}
```

**Response includes:**
```json
{
  "matrix_label": {
    "CO1": {"PO1": "High", "PO2": "Moderate", "PO3": "--", ...},
    "CO2": {"PO2": "High", "PO5": "Moderate", ...}
  },
  "matrix_numeric": {
    "CO1": {"PO1": 3, "PO2": 2, ...}
  },
  "average_po_strength": {"PO1": 2.5, "PO2": 2.75, ...}
}
```

---

### Step 4 — Download Marks Template

```http
GET /template/marks/{session_id}
```
→ Downloads Excel file pre-filled with all Question_IDs.
→ Faculty fills in `Marks_Obtained` column.

**Question_ID format:**
| ID | Meaning |
|----|---------|
| `M1_MB3_a` | Module 1, Module Bank Q3, Bit A |
| `M1_T1B_b` | Module 1, T1 Part B, Bit B |
| `M1_Viva` | Module 1, T2 Viva |
| `M1_DocPPT` | Module 1, T3 Document+PPT |
| `M1_MCQ5` | Module 1, T4 MCQ Q5 |
| `M1_T4Q2_c` | Module 1, T4 Descriptive Q2 Bit C |
| `M1_CLA3` | Module 1, T5 CLA Assignment 3 |
| `Lab_External` | Lab External Exam |
| `ETE_A2_b` | ETE Part A Q2 Bit B |
| `ETE_B1_a` | ETE Part B Q1 Bit A |

---

### Step 5 — Upload Marks & Compute Attainment

```http
POST /attainment/calculate
Content-Type: multipart/form-data

session_id: abc123-...
question_paper: <question_paper.pdf> ← required; used for question-to-CO mapping
marks_file: <filled_marks.xlsx>      ← required; no simulated/random marks are generated
indirect_score: 3.5                  ← Course Exit Survey score (0-5)
```

**Response:**
```json
{
  "co_attainment": [
    {"co_id": "CO1", "ia_pct": 62.5, "ete_pct": 58.0, "final_score": 1.84, "attained": "Attained"}
  ],
  "po_attainment": [
    {"outcome": "PO1", "score": 1.83, "attainment_pct": 61.0, "level": 3}
  ],
  "attained_count": 4,
  "total_cos": 4,
  "pdf_download_url": "/attainment/download/pdf/22CS808/2025-26",
  "excel_download_url": "/attainment/download/excel/22CS808/2025-26",
  "saved_to_db": true
}
```

---

### Step 6 — Download Reports

```http
GET /attainment/download/pdf/22CS808/2025-26
GET /attainment/download/excel/22CS808/2025-26
```
→ These work **any time** — data is fetched from MongoDB and report is regenerated if needed.

**List all stored records:**
```http
GET /attainment/history
```

---

## MongoDB Collections

| Collection | Contents |
|------------|----------|
| `co_sessions` | Session state: syllabus, COs, iteration history, feedback |
| `mappings` | CO-PO-PSO matrix (label + numeric) |
| `attainments` | Full attainment result + report paths |
| `student_marks` | Student-level mark records |

---

## Exam Structure Configuration

All exam parameters are configurable in **Step 1** (`POST /co/generate`).
Default structure:

| Component | Per Module | Marks |
|-----------|------------|-------|
| T1 Part A (Module Bank) | 1 Q randomly assigned | 10M (2+4+4) |
| T1 Part B | Same for all | 10M (2+4+4) |
| T2 Viva | — | 5M |
| T3 Doc+PPT | — | 5M |
| T4 MCQ (10×0.5) | — | 5M |
| T4 Descriptive (3×5) | 3 bits per Q (2+2+1) | 15M |
| T5 CLA (4×20) | — | 80M |
| **IA per module** | | **120M** |
| Lab External | — | 20M |
| ETE Part A (4×8) | 3 bits (3+3+2) | 32M |
| ETE Part B (2×14) | 3 bits (5+5+4) | 28M |
| **ETE Total** | | **80M** |

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `GROQ_API_KEY` | Groq API key (free at console.groq.com) |
| `GROQ_MODEL` | LLM model (default: llama-3.3-70b-versatile) |
| `MONGODB_URL` | MongoDB connection string |
| `MONGODB_DB` | Database name |
| `UPLOAD_DIR` | Directory for temporary uploads |
| `OUTPUT_DIR` | Directory for generated reports |
| `MAX_UPLOAD_MB` | Max upload file size (default: 50MB) |
