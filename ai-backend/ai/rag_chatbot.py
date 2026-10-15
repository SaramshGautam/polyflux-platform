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


# The PolyFlux Assistant's persona. Keep it short and direct — small local
# models follow a brief, concrete system prompt far better than a long one.
POLYFLUX_ASSISTANT_PERSONA = """You are the PolyFlux Assistant, a friendly and encouraging study buddy for students.
Explain things clearly and warmly, like a supportive classmate who's good at the material.
Only use facts from the course material you're given — never make things up.
If the material doesn't cover the question, say so kindly and suggest the student check with their professor.
Keep answers focused and not too long."""


def answer_question(course_id: str, question: str, top_k: int = 3) -> dict:
    try:
        collection        = get_or_create_collection(course_id)
        question_embedding = get_embeddings([question])[0]

        # Check collection isn't empty before querying
        if collection.count() == 0:
            return {
                "answer": "I don't have any course materials to study yet! Ask your professor to upload some notes or slides, and I'll be ready to help.",
                "sources": [],
            }

        results = collection.query(
            query_embeddings=[question_embedding],
            n_results=min(top_k, collection.count()),
        )

        chunks  = results["documents"][0]
        sources = [m["source"] for m in results["metadatas"][0]]

        if not chunks:
            return {
                "answer": "Hmm, I couldn't find anything relevant to that in the course materials I have. Could you try rephrasing, or ask your professor about it?",
                "sources": [],
            }

        context = "\n\n".join(chunks)

        prompt = f"""Course material:
{context[:1500]}

Student's question: {question}

Answer the question using only the course material above. If it's not covered, say so kindly."""

        answer = generate_text(prompt, max_tokens=200, system=POLYFLUX_ASSISTANT_PERSONA)
        return {"answer": answer, "sources": list(set(sources))}

    except Exception as e:
        print(f"[RAG] Error: {e}")
        return {
            "answer": "Oops, I hit a snag trying to answer that — mind giving it another try in a moment?",
            "sources": [],
        }