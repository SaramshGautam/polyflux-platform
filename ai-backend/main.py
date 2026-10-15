from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers.socratic_router import router as socratic_router
from routers.chatbot_router import router as chatbot_router

app = FastAPI(title="Canvas AI")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(socratic_router)
app.include_router(chatbot_router)

@app.get("/")
def root():
    return {"status": "running"}