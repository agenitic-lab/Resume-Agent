# User profile and settings endpoints
import logging
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional

from sqlalchemy.orm.attributes import flag_modified

from database.connection import get_db
from database.models.user import User
from database.models.run import Run
from auth.dependencies import get_current_user, get_current_user_optional
from schemas.auth import UserResponse, ApiKeyUpsertRequest, ApiKeyStatusResponse
from core.security import encrypt_api_key

# Configure logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/user", tags=["User"])


@router.get(
    "/me",
    response_model=UserResponse,
    status_code=status.HTTP_200_OK,
    summary="Get current user information",
    description="Retrieve authenticated user's account information",
    responses={
        200: {
            "description": "User information retrieved successfully",
            "model": UserResponse
        },
        401: {
            "description": "Not authenticated or invalid token",
            "content": {
                "application/json": {
                    "example": {
                        "detail": "Invalid or expired authentication token"
                    }
                }
            }
        }
    }
)
def get_current_user_info(
    current_user: User = Depends(get_current_user)
) -> UserResponse:
    logger.info(f"User info requested: {current_user.email}")
    
    return UserResponse(
        id=str(current_user.id),
        email=current_user.email,
        created_at=current_user.created_at,
        role=current_user.role,
        full_name=current_user.full_name,
        profile_picture=current_user.profile_picture
    )


@router.get(
    "/profile",
    status_code=status.HTTP_200_OK,
    summary="Get user profile",
    description="Retrieve user profile with additional statistics",
    responses={
        200: {
            "description": "Profile retrieved successfully",
            "content": {
                "application/json": {
                    "example": {
                        "user_id": "123e4567-e89b-12d3-a456-426614174000",
                        "email": "user@example.com",
                        "member_since": "2024-01-15T10:30:00Z",
                        "resume_optimizations": 0,
                        "account_status": "active"
                    }
                }
            }
        },
        401: {
            "description": "Not authenticated or invalid token"
        }
    }
)
def get_user_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Get user profile with resume optimization stats
    logger.info(f"Profile requested: {current_user.email}")
    
    resume_count = db.query(Run).filter(Run.user_id == current_user.id).count()
    
    return {
        "user_id": str(current_user.id),
        "email": current_user.email,
        "member_since": current_user.created_at.isoformat(),
        "resume_optimizations": resume_count,
        "account_status": "active"
    }


# Example: Optional Authentication

@router.get(
    "/status",
    status_code=status.HTTP_200_OK,
    summary="Get service status",
    description="Public endpoint with optional authentication for personalized response",
    responses={
        200: {
            "description": "Service status",
            "content": {
                "application/json": {
                    "examples": {
                        "authenticated": {
                            "summary": "Authenticated user",
                            "value": {
                                "service": "Resume Agent API",
                                "status": "operational",
                                "authenticated": True,
                                "user_email": "user@example.com"
                            }
                        },
                        "anonymous": {
                            "summary": "Anonymous user",
                            "value": {
                                "service": "Resume Agent API",
                                "status": "operational",
                                "authenticated": False
                            }
                        }
                    }
                }
            }
        }
    }
)
def get_service_status(
    current_user: User = Depends(get_current_user_optional)
):
    # Get service status (optional auth - enhanced response when authenticated)
    response = {
        "service": "Resume Agent API",
        "status": "operational",
        "authenticated": current_user is not None
    }
    
    if current_user:
        response["user_email"] = current_user.email
        logger.info(f"Status check by authenticated user: {current_user.email}")
    else:
        logger.debug("Status check by anonymous user")
    
    return response


@router.get(
    "/api-key/status",
    response_model=ApiKeyStatusResponse,
    status_code=status.HTTP_200_OK,
    summary="Get BYOK status",
)
def get_api_key_status(
    current_user: User = Depends(get_current_user),
):
    return ApiKeyStatusResponse(
        has_api_key=bool(current_user.encrypted_api_key),
        updated_at=current_user.api_key_updated_at,
    )


@router.post(
    "/api-key",
    status_code=status.HTTP_200_OK,
    summary="Store user API key securely",
)
def set_api_key(
    data: ApiKeyUpsertRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not data.api_key or not data.api_key.strip():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="API key cannot be empty.",
        )
    try:
        encrypted = encrypt_api_key(data.api_key)
    except RuntimeError as exc:
        # ENCRYPTION_KEY env var not set on the server
        logger.error("encrypt_api_key failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Encryption service is not configured on the server. Contact the administrator.",
        ) from exc
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        ) from exc

    current_user.encrypted_api_key = encrypted
    current_user.api_key_updated_at = datetime.now(timezone.utc)
    db.add(current_user)
    db.commit()
    return {"message": "API key saved securely"}


@router.delete(
    "/api-key",
    status_code=status.HTTP_200_OK,
    summary="Delete user API key",
)
def delete_api_key(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    current_user.encrypted_api_key = None
    current_user.api_key_updated_at = None
    db.add(current_user)
    db.commit()
    return {"message": "API key removed"}


# --- Template Preference Endpoints ---

class TemplatePreferenceRequest(BaseModel):
    template_id: str  # e.g. "clean_modern", "jake", "custom_0", "custom_1", "custom_2"
    custom_latex: Optional[str] = None  # only when template_id starts with "custom_"


class CustomTemplateRequest(BaseModel):
    name: str
    latex: str


class TemplatePreferenceResponse(BaseModel):
    template_id: Optional[str] = None
    custom_templates: Optional[list] = None  # [{name, latex}]


MAX_CUSTOM_TEMPLATES = 3


@router.get(
    "/template-preference",
    response_model=TemplatePreferenceResponse,
    status_code=status.HTTP_200_OK,
    summary="Get user's template preference and custom templates",
)
def get_template_preference(
    current_user: User = Depends(get_current_user),
):
    custom_templates = getattr(current_user, 'custom_templates', None) or []
    # Migrate legacy single custom_template_latex to array if needed
    if not custom_templates and current_user.custom_template_latex:
        custom_templates = [{"name": "My Custom Template", "latex": current_user.custom_template_latex}]
    return TemplatePreferenceResponse(
        template_id=current_user.default_template,
        custom_templates=custom_templates,
    )


@router.post(
    "/template-preference",
    status_code=status.HTTP_200_OK,
    summary="Set user's default template preference",
)
def set_template_preference(
    data: TemplatePreferenceRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    current_user.default_template = data.template_id
    db.add(current_user)
    db.commit()
    return {"message": "Template preference saved", "template_id": data.template_id}


@router.post(
    "/custom-template",
    status_code=status.HTTP_200_OK,
    summary="Add a custom template (max 3)",
)
def add_custom_template(
    data: CustomTemplateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    custom_templates = list(getattr(current_user, 'custom_templates', None) or [])
    if len(custom_templates) >= MAX_CUSTOM_TEMPLATES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Maximum {MAX_CUSTOM_TEMPLATES} custom templates allowed",
        )
    custom_templates.append({"name": data.name, "latex": data.latex})
    current_user.custom_templates = custom_templates
    flag_modified(current_user, 'custom_templates')
    db.add(current_user)
    db.commit()
    return {"message": "Custom template added", "index": len(custom_templates) - 1, "custom_templates": custom_templates}


@router.put(
    "/custom-template/{index}",
    status_code=status.HTTP_200_OK,
    summary="Update an existing custom template",
)
def update_custom_template(
    index: int,
    data: CustomTemplateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    custom_templates = list(getattr(current_user, 'custom_templates', None) or [])
    is_legacy = False
    if not custom_templates and current_user.custom_template_latex:
        custom_templates = [{"name": "My Custom Template", "latex": current_user.custom_template_latex}]
        is_legacy = True
    if index < 0 or index >= len(custom_templates):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Custom template not found")
    custom_templates[index] = {"name": data.name, "latex": data.latex}
    current_user.custom_templates = custom_templates
    flag_modified(current_user, 'custom_templates')
    if is_legacy:
        # Migrate: clear the legacy single-template field now that data lives in JSONB
        current_user.custom_template_latex = None
    db.add(current_user)
    db.commit()
    return {"message": "Custom template updated", "custom_templates": custom_templates}


@router.delete(
    "/custom-template/{index}",
    status_code=status.HTTP_200_OK,
    summary="Delete a custom template",
)
def delete_custom_template(
    index: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    custom_templates = list(getattr(current_user, 'custom_templates', None) or [])
    is_legacy = False
    if not custom_templates and current_user.custom_template_latex:
        custom_templates = [{"name": "My Custom Template", "latex": current_user.custom_template_latex}]
        is_legacy = True
    if index < 0 or index >= len(custom_templates):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Custom template not found")
    
    # If the deleted template was the default, clear the default
    if current_user.default_template == f"custom_{index}":
        current_user.default_template = None
    # Adjust default_template index if a template before the default was deleted
    elif current_user.default_template and current_user.default_template.startswith("custom_"):
        try:
            default_idx = int(current_user.default_template.replace("custom_", ""))
            if default_idx > index:
                current_user.default_template = f"custom_{default_idx - 1}"
        except ValueError:
            pass

    custom_templates.pop(index)
    if is_legacy:
        # Clear the legacy single-template field; remaining templates (if any) go into JSONB
        current_user.custom_template_latex = None
    current_user.custom_templates = custom_templates if custom_templates else None
    flag_modified(current_user, 'custom_templates')
    db.add(current_user)
    db.commit()
    return {"message": "Custom template deleted", "custom_templates": custom_templates}


@router.delete(
    "/template-preference",
    status_code=status.HTTP_200_OK,
    summary="Reset template preference to default",
)
def reset_template_preference(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    current_user.default_template = None
    db.add(current_user)
    db.commit()
    return {"message": "Template preference reset"}
