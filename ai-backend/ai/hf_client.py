import os
import threading

from sentence_transformers import SentenceTransformer
from transformers import pipeline, TextIteratorStreamer
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

# Cloud Run doesn't always let PyTorch see the container's real CPU quota —
# it can report the host machine's full core count instead, so PyTorch's
# auto-detected thread pool ends up oversized for what's actually allocated.
# More threads than real quota just means more context-switching, not more
# throughput. Pin it explicitly to match --memory 16Gi's auto-paired 4 vCPUs
# (override via CPU_THREADS if the Cloud Run tier ever changes).
torch.set_num_threads(int(os.getenv("CPU_THREADS", "4")))

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


def _build_prompt(prompt: str, system: str | None, history: list[dict] | None) -> str:
    messages = []
    if system:
        messages.append({"role": "system", "content": system})
    for turn in history or []:
        messages.append(turn)
    messages.append({"role": "user", "content": prompt})
    return generator.tokenizer.apply_chat_template(
        messages,
        tokenize=False,
        add_generation_prompt=True,
    )


# Shared generation settings: greedy decoding (do_sample=False) instead of
# sampling. Sampling doesn't cost meaningfully more per token on its own, but
# it does make the model keep going past the point where it's actually said
# everything useful — it only stops when it happens to sample an end token,
# rather than reliably picking the most likely (often: "done") one. Greedy
# decoding converges to a natural stop sooner, so most answers finish well
# under the max_tokens ceiling instead of running it out by default. A small
# repetition_penalty guards against the classic failure mode of greedy
# decoding on a small model: looping on the same phrase once sampling's
# randomness isn't there to break it out.
_GEN_KWARGS = dict(
    do_sample=False,
    repetition_penalty=1.15,
    return_full_text=False,
)


def generate_text(
    prompt: str,
    model_url: str = None,
    max_tokens: int = 180,
    system: str = None,
    history: list[dict] | None = None,
) -> str:
    """
    `history` is an optional list of {"role": "user"|"assistant", "content": ...}
    turns from earlier in the conversation, inserted between the system
    prompt and the current question so follow-ups ("what about the second
    part?") actually have something to refer back to.
    """
    formatted = _build_prompt(prompt, system, history)
    result = generator(
        formatted,
        max_new_tokens=max_tokens,
        pad_token_id=generator.tokenizer.eos_token_id,
        **_GEN_KWARGS,
    )
    return result[0]["generated_text"].strip()


def generate_text_stream(
    prompt: str,
    max_tokens: int = 180,
    system: str = None,
    history: list[dict] | None = None,
):
    """
    Same generation as generate_text, but yields text pieces as they're
    produced instead of returning the whole answer at once — lets the chat
    show the first words within a second or two instead of waiting the full
    generation time, even though total compute is unchanged.

    Runs generation on a background thread because TextIteratorStreamer is
    fed from inside model.generate() itself; the only way to read from it
    incrementally on the calling thread is to have generate() run elsewhere
    while this function iterates the streamer as values arrive.
    """
    formatted = _build_prompt(prompt, system, history)
    streamer = TextIteratorStreamer(
        generator.tokenizer, skip_prompt=True, skip_special_tokens=True
    )

    thread = threading.Thread(
        target=generator,
        args=(formatted,),
        kwargs=dict(
            max_new_tokens=max_tokens,
            pad_token_id=generator.tokenizer.eos_token_id,
            streamer=streamer,
            **_GEN_KWARGS,
        ),
        daemon=True,
    )
    thread.start()

    try:
        for piece in streamer:
            if piece:
                yield piece
    finally:
        thread.join(timeout=1)

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
