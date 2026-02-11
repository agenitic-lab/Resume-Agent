"""
Authentication Routes

Handles user registration and login endpoints.
Implements secure authentication with JWT tokens.
"""
import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from database.connection import get_db
from database.models.user import User
from schemas.auth import (
    RegisterRequest,
    RegisterResponse,
    LoginRequest,
    LoginResponse,
    UserResponse,
    ErrorResponse
)
from core.security import hash_password, verify_password
from auth.jwt import create_access_token

# Configure logging
logger = logging.getLogger(__name__)

# Create router
router = APIRouter(prefix="/api/auth", tags=["Authentication"])


# ============================================================================
# Registration Endpoint
# ============================================================================

@router.post(
    "/register",
    response_model=RegisterResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user",
    description="Create a new user account with email and password",
    responses={
        201: {
            "description": "User successfully registered",
            "model": RegisterResponse
        },
        400: {
            "description": "Email already registered",
            "model": ErrorResponse
        },
        422: {
            "description": "Validation error",
            "model": ErrorResponse
        }
    }
)
def register_user(
    data: RegisterRequest,
    db: Session = Depends(get_db)
) -> RegisterResponse:
    """
    Register a new user account.
    
    - **email**: Valid email address (must be unique)
    - **password**: Password with minimum 8 characters
    
    Returns the newly created user's ID and email.
    """
    logger.info(f"Registration attempt for email: {data.email}")
    
    # Hash password securely
    hashed_password = hash_password(data.password)

    # Create user instance
    user = User(
        email=data.email,
        password_hash=hashed_password
    )

    # Add to database
    db.add(user)

    try:
        db.commit()
        db.refresh(user)
        logger.info(f"User registered successfully: {user.id}")
        
    except IntegrityError:
        db.rollback()
        logger.warning(f"Registration failed - email already exists: {data.email}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    return RegisterResponse(
        user_id=str(user.id),
        email=user.email,
        message="User registered successfully"
    )


# ============================================================================
# Login Endpoint
# ============================================================================

@router.post(
    "/login",
    response_model=LoginResponse,
    status_code=status.HTTP_200_OK,
    summary="Login and receive JWT token",
    description="Authenticate with email and password to receive a JWT access token",
    responses={
        200: {
            "description": "Login successful, returns JWT token and user info",
            "model": LoginResponse
        },
        401: {
            "description": "Invalid credentials",
            "model": ErrorResponse,
            "content": {
                "application/json": {
                    "example": {
                        "error": "AuthenticationError",
                        "message": "Invalid email or password",
                        "details": None
                    }
                }
            }
        },
        422: {
            "description": "Validation error",
            "model": ErrorResponse
        }
    }
)
def login(
    credentials: LoginRequest,
    db: Session = Depends(get_db)
) -> LoginResponse:
    """
    Authenticate user and return JWT access token.
    
    - **email**: User's registered email address
    - **password**: User's password
    
    Returns:
    - **access_token**: JWT token for authenticated requests
    - **token_type**: Always "bearer"
    - **expires_in**: Token expiration time in seconds
    - **user**: User information (id, email, created_at)
    
    The access token should be included in subsequent requests using the
    Authorization header: `Authorization: Bearer <token>`
    """
    logger.info(f"Login attempt for email: {credentials.email}")
    
    # Step 1: Find user by email
    user = db.query(User).filter(User.email == credentials.email).first()
    
    if not user:
        logger.warning(f"Login failed - user not found: {credentials.email}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    # Step 2: Verify password
    if not verify_password(credentials.password, user.password_hash):
        logger.warning(f"Login failed - invalid password for: {credentials.email}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    # Step 3: Generate JWT token
    try:
        access_token, expires_in = create_access_token(
            user_id=str(user.id),
            email=user.email
        )
        logger.info(f"Login successful for user: {user.id}")
        
    except Exception as e:
        logger.error(f"Token generation failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate access token"
        )
    
    # Step 4: Return response with token and user info
    return LoginResponse(
        access_token=access_token,
        token_type="bearer",
        expires_in=expires_in,
        user=UserResponse(
            id=str(user.id),
            email=user.email,
            created_at=user.created_at
        )
    )
