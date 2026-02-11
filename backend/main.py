from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database.connection import engine, Base
from database.models.user import User
<<<<<<< Updated upstream
from api.routes.pdf import router as pdf_router
from api.routes.latex import router as latex_router
=======
from api.routes.auth import router as auth_router

>>>>>>> Stashed changes

app = FastAPI(
    title="Resume Agent API",
    description="AI-powered resume optimization service",
    version="1.0.0"
)

app.include_router(auth_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(pdf_router)
app.include_router(latex_router)

Base.metadata.create_all(bind=engine)

@app.get("/")
def root():
    return {
        "service": "Resume Agent API",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs"
    }

@app.get("/health")
def health():
    return {"status": "ok"}
