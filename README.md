# OBE System — MERN frontend, Node auth layer, and Python FastAPI backend

This repository contains a React (Vite) frontend, a Node.js/Express authentication & proxy layer, and a Python FastAPI backend that provides the OBE (Course Outcomes) ML and reporting features.

Repository layout
- `client/` — React + Vite frontend (Tailwind CSS). UI pages, components, context and API client.
- `server/` — Node.js/Express auth layer. JWT issuance/verification, MongoDB user model, and proxy routes to the Python API.
- `obe_api/` — Python FastAPI backend. CO generation, mapping, attainment computation, and report export services.
- `docker-compose.yml` — convenience compose file to run services together (optional).

Architecture

Browser -> `client` (Vite, default port 3000)
  - React UI, JWT stored in localStorage, calls `/api/*` on the Node server.

`server` (Express, default port 5000)
  - Handles `/api/auth/*` (register/login), issues JWTs, protects routes and proxies authenticated requests to `obe_api`.

`obe_api` (FastAPI, default port 8000)
  - ML/processing endpoints: CO generation, CO-PO-PSO mapping, attainment calculations, PDF/Excel report generation.

Quick setup

1) Clone repository and open the workspace root.

2) Start the Python backend

```bash
cd obe_api
python -m venv .venv    # optional but recommended
. .venv/Scripts/activate # Windows PowerShell: . .venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

3) Configure and start the Node server

```bash
cd server
cp .env.example .env    # or create .env with values below
npm install
npm run dev
```

Minimum `server/.env` settings

```env
JWT_SECRET=your_random_32_char_secret
MONGODB_URL=mongodb://<user:pass>@host:port/your-db
MONGODB_DB=obe_system
PYTHON_API_URL=http://localhost:8000
PORT=5000
CLIENT_URL=http://localhost:3000
```

4) Start the React frontend

```bash
cd client
npm install
npm run dev
```

Open `http://localhost:3000` in your browser.

Docker (optional)

If you prefer containers, the repository includes `docker-compose.yml` to run services together. Example:

```bash
docker compose up --build
```

Authentication flow

- Users register/login via the Node server endpoints: `/api/auth/register` and `/api/auth/login`.
- Server hashes passwords and returns a JWT (stored client-side for API calls).
- The frontend includes the token with `Authorization: Bearer <token>`; `server` validates JWT and proxies to `obe_api` for protected operations.

Primary UI workflow

1. `/course/new` — Upload syllabus PDF to generate Course Outcomes (COs).
2. `/co/:id/review` — Review / refine generated COs.
3. `/mapping/:id` — Generate CO-PO-PSO matrices.
4. `/attainment/:id` — Upload marks spreadsheet to compute attainment and download reports.
5. `/history` — View previously generated reports and downloads.

Key files and locations

- Frontend: [client/src](client/src) — `App.jsx`, `main.jsx`, `index.css`, `components/`, `pages/`, `context/AuthContext.jsx`.
- Server: [server/index.js](server/index.js) — main Express app and proxy routes.
- Server model: [server/models/User.js](server/models/User.js) — Mongoose user model and password hashing.
- Python backend: [obe_api/main.py](obe_api/main.py) and [obe_api/app/routers](obe_api/app/routers) — API routes and services.

Running tests (Python)

```bash
cd obe_api
pytest
```

Notes & tips

- Keep `PYTHON_API_URL` in `server/.env` pointed at your FastAPI server (http://localhost:8000) during local development.
- Use a secure `JWT_SECRET` in production and switch MongoDB to a managed/cloud-hosted instance.
- Frontend and server run separately in development. The frontend talks to the server which forwards authenticated requests to the Python API.

Contributing

Feel free to open issues or pull requests. If you add features, update this README with new endpoints and instructions.

License

See repository license (if any). If none present, add one before public distribution.

---
Updated to reflect repository structure and run instructions.
