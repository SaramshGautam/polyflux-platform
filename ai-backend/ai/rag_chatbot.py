import os
import chromadb
import re
from ai.hf_client import get_embeddings, generate_text
from ai.pdf_utils import chunk_text

# ── Persistent ChromaDB — survives restarts ───────────────────────────────────
# Defaults to a "chroma_data" folder relative to the working directory.
# Locally (running `uvicorn main:app` from ai-backend/) that's ./ai-backend/chroma_data.
# In the Docker image, WORKDIR is /app, so it resolves to /app/chroma_data —
# matching the original hardcoded path, no Dockerfile change needed.
# Override with CHROMA_DATA_DIR if you want it somewhere else (e.g. a mounted volume).
CHROMA_DATA_DIR = os.getenv("CHROMA_DATA_DIR", "chroma_data")
chroma_client = chromadb.PersistentClient(path=CHROMA_DATA_DIR)


def sanitize_collection_name(course_id: str) -> str:
    sanitized = re.sub(r'[^a-zA-Z0-9._-]', '_', course_id)
    sanitized = sanitized.strip('_.-')
    return sanitized[:512] or "default_course"


def get_or_create_collection(course_id: str):
    name = sanitize_collection_name(course_id)
    return chroma_client.get_or_create_collection(name=f"course_{name}")


def ingest_material(course_id: str, doc_name: str, text: str) -> int:
    """
    Chunk, embed, and upsert a document into the course collection.
    Using upsert (not add) means re-ingesting the same doc_name replaces
    existing chunks rather than creating duplicates.
    """
    collection = get_or_create_collection(course_id)
    chunks     = chunk_text(text)
    embeddings = get_embeddings(chunks)

    # Stable IDs based on doc_name + chunk index — upsert replaces on conflict
    ids       = [f"{doc_name}::chunk_{i}" for i in range(len(chunks))]
    metadatas = [{"source": doc_name, "chunk": i} for i in range(len(chunks))]

    collection.upsert(
        documents=chunks,
        embeddings=embeddings,
        ids=ids,
        metadatas=metadatas,
    )
    return len(chunks)


# The PolyFlux Assistant's persona. Qwen2.5-1.5B-Instruct follows detailed
# instructions far better than TinyLlama did, so this can afford to spell out
# formatting and sourcing rules explicitly rather than staying minimal.
POLYFLUX_ASSISTANT_PERSONA = """You are the PolyFlux Assistant, a friendly and encouraging study buddy for students.
Explain things clearly and warmly, like a supportive classmate who's good at the material — the goal is for the student to actually understand it, not just get an answer.

Formatting (use Markdown):
- Write in short paragraphs.
- **Bold** key terms the first time you use them.
- Use a bullet or numbered list whenever you're giving steps, multiple reasons, or several examples — don't bury a list in one long paragraph.
- Only add a "## Heading" if the answer genuinely has more than one distinct part.
- Keep the whole answer short enough to read in under a minute.

Sourcing:
- Your course material (given below) is the primary source — answer from it first.
- When it's natural, mention which material a fact comes from (e.g. "as covered in Bridge_Load_Analysis.pdf").
- If a background reference from the web is provided, you may use it only to add general context the course material doesn't cover. Always say plainly when you're doing that (e.g. "for general background, Wikipedia notes..."), and never let it contradict or override the course material.
- If a question references something discussed earlier in this conversation, use that context — don't treat every message as standalone.
- If nothing available covers the question, say so kindly and suggest the student check with their professor. Never make facts up."""


def answer_question(
    course_id: str,
    question: str,
    history: list[dict] | None = None,
    web_reference: dict | None = None,
    top_k: int = 4,
) -> dict:
    """
    `history` — prior turns in this chat ({"role": "user"|"assistant", "content": ...}),
    most recent last, so follow-up questions have something to refer back to.
    `web_reference` — an optional {"title", "extract", "url"} dict (see
    ai/web_reference.py) used as supplementary background only; the course
    material (when there is any) always comes first.
    """
    try:
        collection = get_or_create_collection(course_id)
        has_materials = collection.count() > 0

        chunks, sources = [], []
        if has_materials:
            question_embedding = get_embeddings([question])[0]
            results = collection.query(
                query_embeddings=[question_embedding],
                n_results=min(top_k, collection.count()),
            )
            chunks = results["documents"][0]
            sources = list(set(m["source"] for m in results["metadatas"][0]))

        # Nothing usable at all — not even a web reference to fall back on.
        if not chunks and not web_reference:
            if not has_materials:
                answer = "I don't have any course materials to study yet! Ask your professor to upload some notes or slides, and I'll be ready to help."
            else:
                answer = "Hmm, I couldn't find anything relevant to that in the course materials I have. Could you try rephrasing, or ask your professor about it?"
            return {"answer": answer, "sources": [], "web_reference": None}

        context = "\n\n".join(chunks) if chunks else "(No course material matched this question.)"

        web_block = ""
        if web_reference:
            web_block = f"""

Background reference (from the web, NOT your course materials — Wikipedia: "{web_reference['title']}"):
{web_reference['extract']}
"""

        web_instruction = (
            " You may also draw on the background reference above for general "
            "context it doesn't cover, but say plainly when you're doing that."
            if web_reference else ""
        )

        prompt = f"""Course material:
{context[:2000]}
{web_block}
Student's question: {question}

Answer the question using the course material above as your primary source.{web_instruction} If neither covers it, say so kindly."""

        answer = generate_text(
            prompt,
            max_tokens=300,
            system=POLYFLUX_ASSISTANT_PERSONA,
            history=history,
        )
        return {
            "answer": answer,
            "sources": sources,
            "web_reference": web_reference,
        }

    except Exception as e:
        print(f"[RAG] Error: {e}")
        return {
            "answer": "Oops, I hit a snag trying to answer that — mind giving it another try in a moment?",
            "sources": [],
            "web_reference": None,
        }
