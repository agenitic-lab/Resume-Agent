from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database.models.user import User
from api.routes.auth import router as auth_router

try:
    from api.routes.pdf import router as pdf_router
    PDF_AVAILABLE = True
except ImportError:
    PDF_AVAILABLE = False

try:
    from api.routes.latex import router as latex_router
    LATEX_AVAILABLE = True
except ImportError:
    LATEX_AVAILABLE = False

try:
    from api.routes.agent import router as agent_router
    AGENT_AVAILABLE = True
except ImportError:
    AGENT_AVAILABLE = False


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

if PDF_AVAILABLE:
    app.include_router(pdf_router)

if LATEX_AVAILABLE:
    app.include_router(latex_router)

if AGENT_AVAILABLE:
    app.include_router(agent_router)


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
