// Central source of truth for backend URLs. Every component should import
// from here instead of hardcoding a URL — previously these were duplicated
// as literal strings across 14+ files, which made local testing against a
// local Flask/uvicorn instance mean manually editing every one of them (and
// remembering to revert before committing).
//
// To test against a locally running backend, set these in a `.env.local`
// file at the repo root (gitignored, never committed), e.g.:
//
//   REACT_APP_FLASK_API_URL=http://localhost:8080
//   REACT_APP_AI_BACKEND_URL=http://localhost:8000
//
// react-scripts loads .env.local automatically on `npm start` / `npm run
// build`. If a var isn't set, these fall back to the deployed Cloud Run
// production URLs, so nothing breaks for anyone who doesn't set one up.

export const FLASK_API_URL =
  process.env.REACT_APP_FLASK_API_URL ||
  "https://flask-app-l7rilyhu2a-uc.a.run.app";

export const AI_BACKEND_URL =
  process.env.REACT_APP_AI_BACKEND_URL ||
  "https://canvas-ai-backend-l7rilyhu2a-uc.a.run.app";
