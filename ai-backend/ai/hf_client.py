import os

from sentence_transformers import SentenceTransformer
from transformers import pipeline
import torch

# The Cloud Run secret for this is bound as HF_API_TOKEN (our own name, set
# up before this mattered) — but huggingface_hub/transformers only ever
# automatically read an env var literally named HF_TOKEN (or the legacy
# HUGGING_FACE_HUB_TOKEN). That mismatch meant every Hub request has been
# going out unauthenticated this whole time, hitting the low anonymous rate
# limit. TinyLlama mostly got away with it; Qwen's tokenizer makes one extra
# Hub API call (additional_chat_templates) that a 429 + ~230s retry backoff
# on turns into a blown Cloud Run startup probe. Mirroring the value into
# the name the library actually checks fixes it without touching the
# existing secret or the deploy command.
if os.getenv("HF_API_TOKEN") and not os.getenv("HF_TOKEN"):
    os.environ["HF_TOKEN"] = os.environ["HF_API_TOKEN"]

print("Loading embedding model...")
embedder = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")
print("Embedding model ready.")

print("Loading generation model...")
# Qwen2.5-1.5B-Instruct (Alibaba, Apache 2.0 — free, no gating) replaces
# TinyLlama-1.1B here: noticeably better at following instructions (including
# the formatting and "stay grounded in the given material" rules in
# rag_chatbot.py's persona) while still comfortably CPU-sized.
generator = pipeline(
    "text-generation",
    model="Qwen/Qwen2.5-1.5B-Instruct",
    dtype=torch.float32,  # float32 for CPU
)
print("Generation model ready.")


def get_embeddings(texts: list[str]) -> list[list[float]]:
    embeddings = embedder.encode(texts, convert_to_numpy=True)
    return embeddings.tolist()


def generate_text(
    prompt: str,
    model_url: str = None,
    max_tokens: int = 200,
    system: str = None,
    history: list[dict] | None = None,
) -> str:
    """
     is an optional list of {"role": "user"|"assistant", "content": ...}
    turns from earlier in the conversation, inserted between the system
    prompt and the current question so follow-ups ("what about the second
    part?") actually have something to refer back to.
    """
    messages = []
    if system:
        messages.append({"role": "system", "content": system})
    for turn in history or []:
        messages.append(turn)
    messages.append({"role": "user", "content": prompt})

    formatted = generator.tokenizer.apply_chat_template(
        messages,
        tokenize=False,
        add_generation_prompt=True
    )
    result = generator(
        formatted,
        max_new_tokens=max_tokens,
        do_sample=True,
        temperature=0.7,
        pad_token_id=generator.tokenizer.eos_token_id,
        # Only the newly generated continuation, not the prompt echoed back.
        # This also makes the code model-agnostic — no more splitting on a
        # chat-template special token ("<|assistant|>") that was specific to
        # TinyLlama/Zephyr-style templates and would silently break on Qwen's.
        return_full_text=False,
    )
    return result[0]["generated_text"].strip()

# ─── Image captioning (lazy-loaded) ────────────────────────────────────────
# Used by the instructor alignment check to turn a whole-board screenshot
# (which captures freehand drawings and image shapes that have no text of
# their own) into a short text description, so it can be folded into the
# same text-similarity comparison used for everything else on the canvas.
# Loaded on first use rather than at startup, same as everything above is
# eager — this one isn't, since not every request needs it and the service
# is already memory-constrained.
_captioner = None


def caption_image(image_bytes: bytes) -> str:
    global _captioner
    if _captioner is None:
        from transformers import pipeline as _pipeline
        print("Loading image captioning model...")
        _captioner = _pipeline(
            "image-to-text",
            model="Salesforce/blip-image-captioning-base",
        )
        print("Image captioning model ready.")

    from PIL import Image
    import io
    image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    result = _captioner(image)
    return result[0].get("generated_text", "").strip() if result else ""
