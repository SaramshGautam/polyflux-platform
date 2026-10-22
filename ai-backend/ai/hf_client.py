from sentence_transformers import SentenceTransformer
from transformers import pipeline
import torch

print("Loading embedding model...")
embedder = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")
print("Embedding model ready.")

print("Loading generation model...")
generator = pipeline(
    "text-generation",
    model="TinyLlama/TinyLlama-1.1B-Chat-v1.0",
    dtype=torch.float32,  # float32 for CPU on Mac
)
print("Generation model ready.")


def get_embeddings(texts: list[str]) -> list[list[float]]:
    embeddings = embedder.encode(texts, convert_to_numpy=True)
    return embeddings.tolist()


def generate_text(prompt: str, model_url: str = None, max_tokens: int = 200, system: str = None) -> str:
    messages = []
    if system:
        messages.append({"role": "system", "content": system})
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
    )
    full = result[0]["generated_text"]
    return full.split("<|assistant|>")[-1].strip()

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
