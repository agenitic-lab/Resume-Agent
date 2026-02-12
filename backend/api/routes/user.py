"""
User Routes

Protected endpoints requiring authentication.
Demonstrates auth middleware usage and provides user-related functionality.
"""
import logging
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from database.connection import get_db
from database.models.user import User
from auth.dependencies import get_current_user, get_current_user_optional
from schemas.auth import UserResponse

# Configure logging
logger = logging.getLogger(__name__)

# Create router
router = APIRouter(prefix="/api/user", tags=["User"])


# ============================================================================
# Protected Endpoints (Require Authentication)
# ============================================================================

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
    """
    Get current authenticated user's information.
    
    **Protected Endpoint** - Requires valid JWT token in Authorization header.
    
    Returns:
        User information including ID, email, and account creation date
        
    Example:
        ```bash
        curl -H "Authorization: Bearer YOUR_TOKEN" \\
             http://localhost:8000/api/user/me
        ```
    """
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
    
    # TODO: In Sprint 2, query actual optimization runs from database
    # For now, return placeholder data
    resume_count = 0
    
    return {
        "user_id": str(current_user.id),
        "email": current_user.email,
        "member_since": current_user.created_at.isoformat(),
        "resume_optimizations": resume_count,
        "account_status": "active"
    }


# ============================================================================
# Example: Optional Authentication
# ============================================================================

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
