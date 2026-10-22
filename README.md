# PolyFlux

PolyFlux is a classroom collaboration platform: teachers create classrooms and projects, students work together on a real-time collaborative whiteboard in teams, and a project can carry a library of materials (PDFs, slides, docs, video links/uploads) that students can browse — and that power an in-app study assistant ("PolyFlux Assistant") which answers student questions using only the materials the teacher uploaded, with sources cited.

## Repo layout

This is three separate apps in one repo:

- **/ (root)** — React frontend (`src/`, `public/`). Talks to Firebase (Auth/Firestore/Storage) directly, and to the two backends below.
- **backend/** — Flask API (`app.py`), deployed separately (Cloud Run). Handles whiteboard/export-related server-side work.
- **ai-backend/** — FastAPI service (`main.py`), deployed separately (Cloud Run). Runs the RAG study assistant and the Socratic assignment checker. Fully open-source/self-hosted models — see "AI model stack" below.

## Prerequisites

- Node.js 18+ and npm
- Python 3.11 (for both `backend/` and `ai-backend/`)
- A Firebase project (Auth, Firestore, Storage) — ask a maintainer for access or set up your own for local dev
- Optional: a free Hugging Face account + access token (only raises model-download rate limits — the app works without one)

## 1. Frontend setup

```bash
npm install
```

Create `src/firebaseConfig.js` (or confirm it already points at your Firebase project's web config — this is the public client config, safe to commit, different from the admin key below).

```bash
npm start
```

### Pointing the frontend at a local backend

All backend calls go through `src/config/api.js` (`FLASK_API_URL` and
`AI_BACKEND_URL`), which fall back to the deployed Cloud Run URLs if unset.
To test against a backend running locally (see below), create a
`.env.local` in the repo root (already gitignored, never committed):

```
REACT_APP_FLASK_API_URL=http://localhost:8080
REACT_APP_AI_BACKEND_URL=http://localhost:8000
```

`react-scripts` picks this up automatically on `npm start` — no code
changes needed, and nothing to remember to revert before committing.

## 2. Flask backend setup (`backend/`)

```bash
cd backend
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

Copy `.env.example` to `.env` and fill in the real values. You'll also need a Firebase **service account key** — download one from Firebase Console → Project Settings → Service Accounts, save it as `firebase-key.json` in the repo root (never commit this file — it's gitignored on purpose, it grants full admin access to the Firebase project).

Run it with whatever the Dockerfile's `CMD` uses locally (check `backend/Dockerfile`), e.g.:

```bash
flask --app app run --debug
```

## 3. AI backend setup (`ai-backend/`)

```bash
cd ai-backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

Optional `.env`:

```
HF_API_TOKEN=your_hugging_face_token   # optional, only raises HF Hub rate limits
```

Run it:

```bash
uvicorn main:app --reload --port 8080
```

First run will download two models from Hugging Face (a few hundred MB total) — this takes a minute or two and only happens once (cached locally after).

## AI model stack — no paid APIs

The study assistant and Socratic checker run entirely on free, open-weight, self-hosted models — there is no OpenAI (or any other paid LLM API) involved anywhere in this codebase:

- **Embeddings:** `sentence-transformers/all-MiniLM-L6-v2`
- **Answer generation:** `TinyLlama/TinyLlama-1.1B-Chat-v1.0`
- **Vector store:** ChromaDB, running locally inside the ai-backend service (no external vector DB billing)

Both models are downloaded once from Hugging Face Hub (free, no API key required — `HF_API_TOKEN` is purely optional and only raises the download rate limit) and then run locally on the ai-backend's own CPU. The only real cost is whatever compute you deploy ai-backend on (e.g. Cloud Run's normal hosting pricing) — not per-request AI API charges.

## Environment & secrets — do not commit

None of these should ever be committed (and are gitignored):

- `firebase-key.json` — Firebase Admin SDK service account key
- `backend/.env`, `ai-backend/.env` — real secret values (use the checked-in `.env.example` files as templates)
- `ai-backend/chroma_data/` — local vector store data (regenerated from materials, not source)

Also gitignored on purpose: `*_dump/`, `bot_logs_dump/`, `canvas_activity_*`, `nudge_response_*`, `data_dump_all7groups.zip` — these are one-off exports of real classroom/student activity data pulled for research. Never commit new exports like these, even to a private repo.

## Deploying

Both `backend/` and `ai-backend/` deploy to Cloud Run from their own `Dockerfile`s, e.g.:

```bash
cd ai-backend
gcloud run deploy canvas-ai-backend --source . --project <project-id> --region us-central1
```

The frontend deploys to Firebase/Vercel.
