import httpx
from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel
from ai.pdf_utils import (
    extract_text_from_pdf,
    extract_text_from_pptx,
    extract_text_from_docx,
)
from ai.rag_chatbot import ingest_material, answer_question
from ai.web_reference import fetch_wikipedia_reference

router = APIRouter(prefix="/api/chatbot", tags=["chatbot"])


class HistoryTurn(BaseModel):
    # Mirrors the frontend chat message shape ("ai" for the assistant's own
    # turns), translated to the "assistant"/"user" roles a chat template
    # expects right before it's used (see ask() below).
    role: str
    content: str


class QuestionRequest(BaseModel):
    question: str
    # Last few turns of this conversation, oldest first — lets the model
    # handle a follow-up ("what about the second part?") instead of treating
    # every question as standalone. The frontend trims this to a handful of
    # recent turns before sending it.
    history: list[HistoryTurn] = []


# ── Existing: upload a file directly (keep as-is) ─────────────────────────────
@router.post("/upload-material/{course_id}")
async def upload_material(course_id: str, file: UploadFile = File(...)):
    content = await file.read()
    text = extract_text_from_pdf(content)
    num_chunks = ingest_material(course_id, file.filename, text)
    return {"status": "ingested", "chunks": num_chunks}


# ── New: ingest from Firebase Storage URLs ────────────────────────────────────
class PDFDoc(BaseModel):
    name: str
    url:  str

class IngestRequest(BaseModel):
    course_id:  str
    documents:  list[PDFDoc]

@router.post("/ingest")
async def ingest_from_urls(req: IngestRequest):
    """
    Called automatically when a teacher uploads PDFs to a project.
    Downloads each PDF from Firebase Storage, extracts text, and
    ingests into the ChromaDB collection for that course.

    Ingestion is idempotent — re-ingesting the same filename replaces
    existing chunks (ChromaDB upsert via same chunk IDs).
    """
    results = []

    async with httpx.AsyncClient(timeout=60) as client:
        for doc in req.documents:
            if not doc.url or not doc.name:
                results.append({"name": doc.name, "status": "skipped", "reason": "missing url or name"})
                continue
            try:
                # 1. Download PDF from Firebase Storage
                resp = await client.get(doc.url)
                resp.raise_for_status()

                # 2. Extract text — pick the parser by file extension. PDFs
                # use the existing PyMuPDF util; slide decks and Word docs
                # get their own extractors. Legacy binary .ppt/.doc formats
                # aren't parseable here, so they're skipped with a clear
                # reason rather than silently producing empty text.
                ext = doc.name.rsplit(".", 1)[-1].lower() if "." in doc.name else ""
                if ext == "pdf":
                    text = extract_text_from_pdf(resp.content)
                elif ext == "pptx":
                    text = extract_text_from_pptx(resp.content)
                elif ext == "docx":
                    text = extract_text_from_docx(resp.content)
                elif ext in ("ppt", "doc"):
                    results.append({
                        "name": doc.name,
                        "status": "skipped",
                        "reason": f"legacy .{ext} format isn't supported for AI indexing — re-save as .{ext}x and re-upload",
                    })
                    continue
                else:
                    results.append({
                        "name": doc.name,
                        "status": "skipped",
                        "reason": f"unsupported file type: .{ext or 'unknown'}",
                    })
                    continue

                if not text.strip():
                    results.append({"name": doc.name, "status": "skipped", "reason": "no extractable text"})
                    continue

                # 3. Chunk + embed + store (reuses your existing RAG function)
                num_chunks = ingest_material(req.course_id, doc.name, text)
                results.append({"name": doc.name, "status": "ok", "chunks": num_chunks})

            except httpx.HTTPStatusError as e:
                results.append({"name": doc.name, "status": "error", "reason": f"download failed: {e.response.status_code}"})
            except Exception as e:
                results.append({"name": doc.name, "status": "error", "reason": str(e)})

    return {"course_id": req.course_id, "results": results}


# ── Existing: ask a question ──────────────────────────────────────────────────
@router.post("/ask/{course_id}")
async def ask(course_id: str, body: QuestionRequest):
    # Best-effort, free background reference from Wikipedia. Never blocks or
    # fails the answer — a lookup miss or network hiccup just means Poly
    # answers from the course materials alone, same as before this existed.
    web_reference = await fetch_wikipedia_reference(body.question)

    history = [
        {"role": "assistant" if h.role == "ai" else "user", "content": h.content}
        for h in body.history[-6:]
    ]

    result = answer_question(
        course_id,
        body.question,
        history=history,
        web_reference=web_reference,
    )
    return result