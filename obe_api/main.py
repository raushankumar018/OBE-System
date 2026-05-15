"""
main.py
───────
FastAPI application entry point.
"""

import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import get_settings
from app.database import connect_db, close_db
from app.routers import router_co, router_mapping, router_attainment
from app.utils.marks_template import router as template_router

settings = get_settings()
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FRONTEND_DIR = os.path.join(BASE_DIR, "frontend")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # ── Startup ────────────────────────────────────────────────────────────
    os.makedirs(settings.upload_dir, exist_ok=True)
    os.makedirs(settings.output_dir, exist_ok=True)
    await connect_db()
    print("OBE API started.")
    yield
    # ── Shutdown ───────────────────────────────────────────────────────────
    await close_db()
    print("OBE API stopped.")


app = FastAPI(
    title="AI-Powered CO-PO-PSO Mapping & Attainment API",
    description="""
## OBE Automation System — Vignan's University

**Complete workflow:**

1. **Upload Syllabus → Generate COs**
   - `POST /co/generate` — Upload PDF/DOCX/TXT syllabus
   - `POST /co/feedback` — Review COs; regenerate with feedback if needed
   - `POST /co/confirm`  — Confirm COs when satisfied

2. **CO-PO-PSO Mapping**
   - `POST /mapping/generate` — Hybrid semantic + LLM mapping with High/Moderate/Low strength

3. **Student Marks → Attainment**
   - `POST /attainment/calculate` — Upload student marks Excel, compute CO/PO/PSO attainment
   - `GET  /attainment/download/pdf/{course}/{year}` — Download PDF report
   - `GET  /attainment/download/excel/{course}/{year}` — Download Excel report

4. **History & Re-download**
   - `GET /attainment/history` — List all stored records
   - All data persisted in MongoDB — re-download anytime

---
**Exam structure supported:**
- 2 Modules × T1(PartA+PartB) + T2(Viva) + T3(Doc/PPT) + T4(MCQ+Desc) + T5(4×CLA)
- Lab External (20M) + ETE PartA (4×8M) + ETE PartB (2×14M)
""",
    version="1.0.0",
    lifespan=lifespan,
)

# ── CORS ───────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ────────────────────────────────────────────────────────────────
app.include_router(router_co.router)
app.include_router(router_mapping.router)
app.include_router(router_attainment.router)
app.include_router(template_router)

# ── Serve output files statically ─────────────────────────────────────────
if os.path.exists(FRONTEND_DIR):
    app.mount("/ui", StaticFiles(directory=FRONTEND_DIR, html=True), name="ui")

if os.path.exists(settings.output_dir):
    app.mount("/files", StaticFiles(directory=settings.output_dir), name="files")


# ── Health check ───────────────────────────────────────────────────────────
@app.get("/", tags=["Health"])
async def root():
    return {
        "status": "running",
        "app": "OBE AI System",
        "version": "1.0.0",
        "docs": "/docs",
        "redoc": "/redoc",
    }


@app.get("/health", tags=["Health"])
async def health():
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
