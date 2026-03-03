import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from database.connection import get_db
from database.models.user import User
from schemas.auth import LoginResponse, UserResponse, ErrorResponse
from schemas.google import GoogleLoginRequest
from auth.jwt import create_access_token
from auth.google_oauth import verify_google_token
from auth.dependencies import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


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
    logger.info("Google OAuth authentication attempt")

    try:
        google_user = verify_google_token(data.credential)
    except ValueError as e:
        logger.error(f"Google token verification failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
            headers={"WWW-Authenticate": "Bearer"}
        )

    try:
        user = db.query(User).filter(User.google_id == google_user.google_id).first()

        if user:
            logger.info(f"Existing Google user logging in: {user.email}")
            if google_user.profile_picture and user.profile_picture != google_user.profile_picture:
                user.profile_picture = google_user.profile_picture
            if google_user.full_name and user.full_name != google_user.full_name:
                user.full_name = google_user.full_name
            db.commit()
            db.refresh(user)
        else:
            # Check if email exists from a previous registration method
            user = db.query(User).filter(User.email == google_user.email).first()

            if user:
                logger.info(f"Linking existing account to Google: {user.email}")
                user.google_id = google_user.google_id
                user.auth_provider = 'google'
                user.profile_picture = google_user.profile_picture
                user.full_name = google_user.full_name
                db.commit()
                db.refresh(user)
            else:
                logger.info(f"Creating new Google user: {google_user.email}")
                user = User(
                    email=google_user.email,
                    google_id=google_user.google_id,
                    auth_provider='google',
                    profile_picture=google_user.profile_picture,
                    full_name=google_user.full_name,
                    password_hash=None
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
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Database error during Google auth: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database error during authentication. Please try again."
        )

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

    return LoginResponse(
        access_token=access_token,
        token_type="bearer",
        expires_in=expires_in,
        user=UserResponse(
            id=str(user.id),
            email=user.email,
            created_at=user.created_at,
            role=user.role
        )
    )


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
    return UserResponse(
        id=str(current_user.id),
        email=current_user.email,
        created_at=current_user.created_at,
        full_name=current_user.full_name,
        profile_picture=current_user.profile_picture,
        role=current_user.role
    )
