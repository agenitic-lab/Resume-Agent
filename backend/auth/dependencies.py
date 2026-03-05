"""
Authentication Dependencies

FastAPI dependencies for protecting routes with JWT authentication.
Provides secure token validation and user retrieval.
Supports both HttpOnly cookies (preferred) and Bearer token headers.
"""
import logging
import uuid
from typing import Optional
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from database.connection import get_db
from database.models.user import User
from auth.jwt import decode_access_token

# Configure logging
logger = logging.getLogger(__name__)

# Bearer token security scheme (for backward compatibility)
security = HTTPBearer(
    scheme_name="Bearer",
    description="JWT Bearer token authentication",
    auto_error=False  # Don't auto error - we'll check cookies first
)


class AuthenticationError(HTTPException):
    """Custom exception for authentication failures."""
    
    def __init__(self, detail: str, headers: Optional[dict] = None):
        """
        Initialize authentication error.
        
        Args:
            detail: Error message
            headers: Optional HTTP headers (e.g., WWW-Authenticate)
        """
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=detail,
            headers=headers or {"WWW-Authenticate": "Bearer"}
        )


def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """
    Verify JWT token and return authenticated user.
    
    This dependency validates the JWT token from either:
    1. HttpOnly cookie (preferred - more secure)
    2. Authorization header (fallback for API clients)
    
    Usage:
        ```python
        @router.get("/protected")
        def protected_route(current_user: User = Depends(get_current_user)):
            return {"user_id": str(current_user.id)}
        ```
    
    Args:
        request: FastAPI request to access cookies
        credentials: HTTP Bearer token credentials from request header
        db: Database session dependency
        
    Returns:
        User: Authenticated user object from database
        
    Raises:
        AuthenticationError: If token is invalid, expired, or user not found
    """
    # Try to get token from cookie first (more secure)
    token = request.cookies.get("access_token")
    
    # Fall back to Authorization header if no cookie
    if not token and credentials:
        token = credentials.credentials
    
    if not token:
        logger.warning("Authentication failed: No token provided")
        raise AuthenticationError(
            detail="Authentication required"
        )
    
    # Log authentication attempt (without exposing token)
    logger.debug("Authentication attempt with JWT token")
    
    # Step 1: Decode and validate JWT token
    payload = decode_access_token(token)
    
    if not payload:
        logger.warning("Authentication failed: Invalid or expired token")
        raise AuthenticationError(
            detail="Invalid or expired authentication token"
        )
    
    # Step 2: Extract user ID from token payload
    user_id: Optional[str] = payload.get("sub")
    
    if not user_id:
        logger.warning("Authentication failed: Token missing 'sub' claim")
        raise AuthenticationError(
            detail="Invalid token payload: missing user identifier"
        )
    
    # Step 3: Retrieve user from database
    try:
        # Convert user_id string to UUID object for database query
        user_uuid = uuid.UUID(user_id)
        user = db.query(User).filter(User.id == user_uuid).first()
    except ValueError:
        logger.warning(f"Authentication failed: Invalid UUID format: {user_id}")
        raise AuthenticationError(
            detail="Invalid token payload: malformed user identifier"
        )
    except Exception as e:
        logger.error(f"Database error during authentication: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Authentication service temporarily unavailable"
        )
    
    if not user:
        logger.warning(f"Authentication failed: User not found (ID: {user_id})")
        raise AuthenticationError(
            detail="User account not found or has been deleted"
        )
    
    # Step 4: Check if user is blocked
    if getattr(user, 'is_blocked', False):
        logger.warning(f"Authentication failed: User is blocked (ID: {user_id})")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account has been blocked. Please contact support."
        )
    
    # Success - log and return user
    logger.info(f"User authenticated successfully: {user.email} (ID: {user_id})")
    
    return user


def get_current_user_optional(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(
        HTTPBearer(auto_error=False)
    ),
    db: Session = Depends(get_db)
) -> Optional[User]:
    """
    Optional authentication dependency.
    
    Returns the authenticated user if valid token is provided (cookie or header),
    otherwise returns None without raising an error.
    
    Useful for endpoints that have different behavior for
    authenticated vs. anonymous users.
    
    Usage:
        ```python
        @router.get("/content")
        def get_content(user: Optional[User] = Depends(get_current_user_optional)):
            if user:
                return {"content": "premium", "user": user.email}
            return {"content": "free"}
        ```
    
    Args:
        request: FastAPI request to access cookies
        credentials: Optional HTTP Bearer token credentials
        db: Database session dependency
        
    Returns:
        User object if authenticated, None otherwise
    """
    # Check for token in cookie or header
    token = request.cookies.get("access_token")
    if not token and credentials:
        token = credentials.credentials
    
    if not token:
        return None
    
    try:
        # Create a mock credentials object if we got token from cookie
        class MockCredentials:
            def __init__(self, token):
                self.credentials = token
        
        return get_current_user(request, MockCredentials(token) if not credentials else credentials, db)
    except (AuthenticationError, HTTPException):
        # Silently fail for optional authentication
        return None

def get_current_admin(
    current_user: User = Depends(get_current_user)
) -> User:
    """
    Dependency to require admin privileges.
    """
    if getattr(current_user, 'role', 'user') != 'admin':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required"
        )
    return current_user
