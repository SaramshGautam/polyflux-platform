from fastapi import APIRouter, UploadFile, File, Body
from pydantic import BaseModel
from ai.pdf_utils import extract_text_from_pdf
from ai.socratic import check_alignment

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
async def check(assignment_id: str, canvas_content: str = Body(..., embed=True)):
    if assignment_id not in assignment_store:
        return {"error": "Assignment not found"}
    result = check_alignment(canvas_content, assignment_store[assignment_id])
    return result