# User profile and settings endpoints
import logging
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

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
        created_at=current_user.created_at
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
    """
    Get user profile with statistics.
    
    **Protected Endpoint** - Requires valid JWT token.
    
    Returns user information along with usage statistics like
    number of resume optimizations performed.
    
    Note:
        Resume optimization count will be implemented in Sprint 2
        when the optimization runs table is connected.
    """
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
    """
    Get service status with optional authentication.
    
    This endpoint demonstrates optional authentication - it works
    for both authenticated and anonymous users, but provides
    personalized information when authenticated.
    
    **No authentication required**, but enhanced response if authenticated.
    """
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
    current_user.encrypted_api_key = encrypt_api_key(data.api_key)
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
