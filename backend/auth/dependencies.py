"""
Authentication Dependencies

FastAPI dependencies for protecting routes with JWT authentication.
Provides secure token validation and user retrieval.
"""
import logging
import uuid
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from database.connection import get_db
from database.models.user import User
from auth.jwt import decode_access_token

# Configure logging
logger = logging.getLogger(__name__)

# Bearer token security scheme
security = HTTPBearer(
    scheme_name="Bearer",
    description="JWT Bearer token authentication"
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
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """
    Verify JWT token and return authenticated user.
    
    This dependency validates the JWT token from the Authorization header,
    verifies the token signature and expiration, and retrieves the user
    from the database.
    
    Usage:
        ```python
        @router.get("/protected")
        def protected_route(current_user: User = Depends(get_current_user)):
            return {"user_id": str(current_user.id)}
        ```
    
    Args:
        credentials: HTTP Bearer token credentials from request header
        db: Database session dependency
        
    Returns:
        User: Authenticated user object from database
        
    Raises:
        AuthenticationError: If token is invalid, expired, or user not found
        
    Security:
        - Validates JWT signature using secret key
        - Checks token expiration timestamp
        - Verifies user still exists in database
        - Logs all authentication attempts for security auditing
    """
    token = credentials.credentials
    
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
    
    # Success - log and return user
    logger.info(f"User authenticated successfully: {user.email} (ID: {user_id})")
    
    return user


def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(
        HTTPBearer(auto_error=False)
    ),
    db: Session = Depends(get_db)
) -> Optional[User]:
    """
    Optional authentication dependency.
    
    Returns the authenticated user if valid token is provided,
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
        credentials: Optional HTTP Bearer token credentials
        db: Database session dependency
        
    Returns:
        User object if authenticated, None otherwise
    """
    if not credentials:
        return None
    
    try:
        return get_current_user(credentials, db)
    except (AuthenticationError, HTTPException):
        # Silently fail for optional authentication
        return None
