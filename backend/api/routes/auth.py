# Auth endpoints - register and login
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
from schemas.google import GoogleLoginRequest
from core.security import hash_password, verify_password
from auth.jwt import create_access_token
from auth.google_oauth import verify_google_token
from auth.dependencies import get_current_user

# Configure logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


# Registration Endpoint

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
    logger.info(f"Registration attempt for email: {data.email}")
    
    # Hash password securely
    hashed_password = hash_password(data.password)

    # Create user instance
    user = User(
        email=data.email,
        password_hash=hashed_password,
        auth_provider='email'
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


# Login Endpoint

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
    
    # Step 2: Check if user is OAuth user
    if user.auth_provider != 'email':
        logger.warning(f"Login failed - OAuth user attempted password login: {credentials.email}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"This account uses {user.auth_provider} authentication. Please sign in with {user.auth_provider}.",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    # Step 3: Verify password
    if not verify_password(credentials.password, user.password_hash):
        logger.warning(f"Login failed - invalid password for: {credentials.email}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    # Step 4: Generate JWT token
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
    
    # Step 5: Return response with token and user info
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


# ============================================================================
# Google OAuth Endpoint
# ============================================================================

@router.post(
    "/google",
    response_model=LoginResponse,
    status_code=status.HTTP_200_OK,
    summary="Authenticate with Google",
    description="Sign in or sign up using Google OAuth. Creates account if user doesn't exist.",
    responses={
        200: {
            "description": "Authentication successful, returns JWT token and user info",
            "model": LoginResponse
        },
        401: {
            "description": "Invalid Google token",
            "model": ErrorResponse
        }
    }
)
def google_auth(
    data: GoogleLoginRequest,
    db: Session = Depends(get_db)
) -> LoginResponse:
    """
    Authenticate user with Google OAuth.
    
    - **credential**: Google ID token from Google Sign-In
    
    This endpoint handles both sign-in and sign-up:
    - If user exists: logs them in
    - If user doesn't exist: creates account and logs them in
    
    Returns:
    - **access_token**: JWT token for authenticated requests
    - **token_type**: Always "bearer"
    - **expires_in**: Token expiration time in seconds
    - **user**: User information
    """
    logger.info("Google OAuth authentication attempt")
    
    # Step 1: Verify Google token and extract user info
    try:
        google_user = verify_google_token(data.credential)
    except ValueError as e:
        logger.error(f"Google token verification failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    # Step 2: Check if user exists by google_id
    user = db.query(User).filter(User.google_id == google_user.google_id).first()
    
    if user:
        # Existing user - update profile info if changed
        logger.info(f"Existing Google user logging in: {user.email}")
        if google_user.profile_picture and user.profile_picture != google_user.profile_picture:
            user.profile_picture = google_user.profile_picture
        if google_user.full_name and user.full_name != google_user.full_name:
            user.full_name = google_user.full_name
        db.commit()
        db.refresh(user)
    else:
        # Check if email already exists (user might have registered with email/password)
        user = db.query(User).filter(User.email == google_user.email).first()
        
        if user:
            # Email exists but not linked to Google - link it
            logger.info(f"Linking existing email account to Google: {user.email}")
            user.google_id = google_user.google_id
            user.auth_provider = 'google'
            user.profile_picture = google_user.profile_picture
            user.full_name = google_user.full_name
            db.commit()
            db.refresh(user)
        else:
            # New user - create account
            logger.info(f"Creating new Google user: {google_user.email}")
            user = User(
                email=google_user.email,
                google_id=google_user.google_id,
                auth_provider='google',
                profile_picture=google_user.profile_picture,
                full_name=google_user.full_name,
                password_hash=None  # OAuth users don't have passwords
            )
            db.add(user)
            
            try:
                db.commit()
                db.refresh(user)
                logger.info(f"Google user created successfully: {user.id}")
            except IntegrityError:
                db.rollback()
                logger.error(f"Failed to create Google user - integrity error: {google_user.email}")
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to create user account"
                )
    
    # Step 3: Generate JWT token
    try:
        access_token, expires_in = create_access_token(
            user_id=str(user.id),
            email=user.email
        )
        logger.info(f"Google authentication successful for user: {user.id}")
        
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


# ============================================================================
# User Profile Endpoint
# ============================================================================

@router.get(
    "/me",
    response_model=UserResponse,
    status_code=status.HTTP_200_OK,
    summary="Get current user",
    description="Get the currently authenticated user's profile information.",
    responses={
        200: {
            "description": "User profile retrieved successfully",
            "model": UserResponse
        },
        401: {
            "description": "Not authenticated",
            "model": ErrorResponse
        }
    }
)
def get_current_user_profile(
    current_user: User = Depends(get_current_user)
) -> UserResponse:
    """
    Get the currently authenticated user's profile.
    
    Returns:
    - **user**: User information (id, email, created_at)
    """
    return UserResponse(
        id=str(current_user.id),
        email=current_user.email,
        created_at=current_user.created_at,
        full_name=current_user.full_name,
        profile_picture=current_user.profile_picture
    )
