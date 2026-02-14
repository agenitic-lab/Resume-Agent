from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging
from api.routes.auth import router as auth_router
from api.routes.user import router as user_router
from database.connection import ensure_runtime_schema
from config import settings

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

from api.routes.agent import router as agent_router

AGENT_AVAILABLE = True
logger = logging.getLogger(__name__)


app = FastAPI(
    title=settings.APP_NAME,
    description="AI-powered resume optimization service",
    version=settings.APP_VERSION
)

# CORS must be registered before routers
allowed_origins = settings.get_allowed_origins_list()
allow_origin_regex = settings.ALLOWED_ORIGIN_REGEX

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=allow_origin_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(user_router)

if PDF_AVAILABLE:
    app.include_router(pdf_router)

if LATEX_AVAILABLE:
    app.include_router(latex_router)

if AGENT_AVAILABLE:
    app.include_router(agent_router)


@app.on_event("startup")
def startup():
    import threading

    def _migrate():
        try:
            ensure_runtime_schema()
            logger.info("Runtime schema ensured successfully")
        except Exception as exc:
            logger.exception("Failed to ensure runtime schema: %s", exc)

    # Run in a daemon thread so server starts immediately
    thread = threading.Thread(target=_migrate, daemon=True)
    thread.start()



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
