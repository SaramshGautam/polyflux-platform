import numpy as np
from ai.hf_client import get_embeddings, generate_text

def cosine_similarity(vec_a, vec_b):
    a, b = np.array(vec_a), np.array(vec_b)
    return float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b)))

def check_alignment(canvas_content: str, assignment_text: str, threshold: float = 0.45) -> dict:
    try:
        vectors = get_embeddings([canvas_content, assignment_text])
        score = cosine_similarity(vectors[0], vectors[1])

        if score >= threshold:
            return {"aligned": True, "score": round(score, 3), "message": None}

        prompt = f"""You are a teaching assistant. A student's canvas discussion seems off-track from their assignment.

Assignment goal: {assignment_text[:400]}

Student discussion: {canvas_content[:300]}

Ask one short Socratic question to redirect the student toward the assignment goals:"""

        question = generate_text(prompt, max_tokens=120)
        return {"aligned": False, "score": round(score, 3), "message": question}

    except Exception as e:
        # HF unreachable — return a mock nudge so UI can be tested
        print(f"[Socratic] HF API unavailable, using mock: {e}")
        return {
            "aligned": False,
            "score": 0.12,
            "message": "Your discussion seems to be going off track — how does what you're working on connect to the assignment goals your professor outlined?"
        }