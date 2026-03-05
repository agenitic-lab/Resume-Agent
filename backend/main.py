from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import logging
from api.routes.auth import router as auth_router
from api.routes.user import router as user_router
from api.routes.admin import router as admin_router
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
from api.routes.resume_builder import router as resume_builder_router
from api.routes.missing_skills import router as missing_skills_router
from api.routes.support import router as support_router

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

from auth.dependencies import AuthenticationError

# ---------------------------------------------------------------------------
# Global exception handler — ensures unhandled errors produce a proper JSON
# response *inside* the middleware chain so CORSMiddleware can still inject
# Access-Control-Allow-Origin headers.  Without this, unhandled exceptions
# bubble past CORSMiddleware and are caught by Starlette's outer
# ServerErrorMiddleware, which returns a bare 500 with NO CORS headers.
# ---------------------------------------------------------------------------
@app.exception_handler(Exception)
async def _unhandled_exception_handler(request: Request, exc: Exception):
    logger.error("Unhandled exception on %s %s: %s", request.method, request.url.path, exc, exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
    )


@app.exception_handler(AuthenticationError)
async def auth_exception_handler(request: Request, exc: AuthenticationError):
    # Suppress FastAPI's default HTTP log for the silent auth check endpoint
    if request.url.path == "/api/auth/check":
        # By not re-raising the HTTPException, Starlette handles it natively 
        # as a standard response, avoiding the error trace in console logs
        return JSONResponse(
            status_code=exc.status_code,
            content={"detail": exc.detail},
            headers=exc.headers
        )
    
    # For all other routes, return standard JSON response
    # It will still be logged by FastAPI's access logger, but without a messy traceback
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
        headers=exc.headers
    )


app.include_router(auth_router)
app.include_router(user_router)
app.include_router(admin_router)

if PDF_AVAILABLE:
    app.include_router(pdf_router)

if LATEX_AVAILABLE:
    app.include_router(latex_router)

if AGENT_AVAILABLE:
    app.include_router(agent_router)

app.include_router(resume_builder_router)
app.include_router(missing_skills_router)
app.include_router(support_router)


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
        "service": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "running",
        "docs": "/docs"
    }


@app.api_route("/health", methods=["GET", "HEAD"])
def health():
    return {"status": "ok"}

# Last reload triggered at: 2026-03-02 14:14:00 PM