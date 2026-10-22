from fastapi import APIRouter, UploadFile, File, Body
from pydantic import BaseModel
import httpx
from ai.pdf_utils import extract_text_from_pdf
from ai.socratic import check_alignment
from ai.hf_client import caption_image

router = APIRouter(prefix="/api/socratic", tags=["socratic"])

# In production store this in your DB per assignment
assignment_store: dict[str, str] = {}

@router.post("/upload-assignment/{assignment_id}")
async def upload_assignment(assignment_id: str, file: UploadFile = File(...)):
    content = await file.read()
    text = extract_text_from_pdf(content)
    assignment_store[assignment_id] = text
    return {"status": "stored", "chars": len(text)}


class AssignmentText(BaseModel):
    text: str


# Plain-text counterpart to /upload-assignment above — used by the instructor
# alignment check, which already has the project description as text and
# doesn't need to round-trip it through a PDF.
@router.post("/upload-assignment-text/{assignment_id}")
async def upload_assignment_text(assignment_id: str, body: AssignmentText):
    assignment_store[assignment_id] = body.text
    return {"status": "stored", "chars": len(body.text)}


@router.post("/check/{assignment_id}")
async def check(
    assignment_id: str,
    canvas_content: str = Body(..., embed=True),
    board_image_url: str | None = Body(None, embed=True),
):
    if assignment_id not in assignment_store:
        return {"error": "Assignment not found"}

    combined_content = canvas_content
    caption = None

    # A whole-board screenshot catches freehand drawings and image shapes
    # that have no text props of their own — caption it and fold the
    # description into the same text comparison as everything else, rather
    # than trying to score the image separately.
    if board_image_url:
        try:
            async with httpx.AsyncClient(timeout=20) as client:
                resp = await client.get(board_image_url)
                resp.raise_for_status()
            caption = caption_image(resp.content)
            if caption:
                combined_content = f"{canvas_content}\n\n[Whiteboard image shows: {caption}]"
        except Exception as e:
            print(f"WARN: could not caption board screenshot: {e}")

    result = check_alignment(combined_content, assignment_store[assignment_id])
    if caption:
        result["image_caption"] = caption
    return result
