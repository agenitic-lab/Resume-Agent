import logging
import uuid
from fastapi import APIRouter, Depends, HTTPException, status, Request, Response
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from typing import Optional

from database.connection import get_db
from database.models.user import User
from schemas.auth import AuthResponse, AuthCheckResponse, UserResponse, ErrorResponse
from schemas.google import GoogleLoginRequest
from auth.jwt import (
    create_access_token,
    create_refresh_token,
    decode_refresh_token,
    ACCESS_TOKEN_EXPIRE_MINUTES,
    REFRESH_TOKEN_EXPIRE_DAYS,
)
from auth.google_oauth import verify_google_token
from auth.dependencies import get_current_user, get_current_user_optional
from config import settings
from services.email import send_welcome_email

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


def set_auth_cookies(response: Response, access_token: str, refresh_token: str) -> None:
    """Set secure HttpOnly cookies for authentication tokens."""
    # Common cookie settings
    cookie_kwargs = {
        "httponly": True,
        "secure": settings.COOKIE_SECURE,
        "samesite": settings.COOKIE_SAMESITE,
    }

    # Add domain if specified (for cross-subdomain)
    if settings.COOKIE_DOMAIN:
        cookie_kwargs["domain"] = settings.COOKIE_DOMAIN

    # Set access token cookie (short-lived)
    response.set_cookie(
        key="access_token",
        value=access_token,
        max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        path="/",
        **cookie_kwargs
    )

    # Set refresh token cookie (long-lived, restricted path)
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        max_age=REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
        path="/api/auth",  # Only sent to auth endpoints
        **cookie_kwargs
    )


def clear_auth_cookies(response: Response) -> None:
    """Clear authentication cookies."""
    cookie_kwargs = {
        "httponly": True,
        "secure": settings.COOKIE_SECURE,
        "samesite": settings.COOKIE_SAMESITE,
    }

    if settings.COOKIE_DOMAIN:
        cookie_kwargs["domain"] = settings.COOKIE_DOMAIN

    response.delete_cookie(key="access_token", path="/", **cookie_kwargs)
    response.delete_cookie(key="refresh_token", path="/api/auth", **cookie_kwargs)


@router.post(
    "/google",
    response_model=AuthResponse,
    status_code=status.HTTP_200_OK,
    summary="Authenticate with Google",
    description="Sign in or sign up using Google OAuth. Creates account if user doesn't exist. Tokens are set in HttpOnly cookies.",
    responses={
        200: {
            "description": "Authentication successful, tokens set in cookies",
            "model": AuthResponse
        },
        401: {
            "description": "Invalid Google token",
            "model": ErrorResponse
        }
    }
)
def google_auth(
    data: GoogleLoginRequest,
    response: Response,
    db: Session = Depends(get_db)
) -> AuthResponse:
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

                    # Send welcome email (non-blocking — signup succeeds regardless)
                    try:
                        send_welcome_email(
                            name=user.full_name or "there",
                            email=user.email
                        )
                    except Exception as e:
                        logger.warning(f"Welcome email failed for {user.email}: {e}")

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

    if user.is_blocked:
        logger.warning(f"Blocked user attempted login: {user.email}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account has been blocked. Please contact support."
        )

    try:
        # Generate access token and refresh token
        access_token, _ = create_access_token(
            user_id=str(user.id),
            email=user.email
        )
        refresh_token, _ = create_refresh_token(user_id=str(user.id))

        # Set tokens in secure HttpOnly cookies
        set_auth_cookies(response, access_token, refresh_token)

        logger.info(f"Google authentication successful for user: {user.id}")

    except Exception as e:
        logger.error(f"Token generation failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate access token"
        )

    # Return minimal response - tokens are in cookies, not in body
    return AuthResponse(
        success=True,
        message="Authentication successful",
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


@router.get(
    "/check",
    response_model=AuthCheckResponse,
    status_code=status.HTTP_200_OK,
    summary="Check current user silently",
    description="Returns 200 with authenticated=false when logged out (no 401), so browsers and monitors do not flag a normal state as an error.",
    responses={
        200: {
            "description": "Session state and optional user profile",
            "model": AuthCheckResponse
        },
    }
)
def check_current_user_profile(
    user: Optional[User] = Depends(get_current_user_optional)
) -> AuthCheckResponse:
    if not user:
        return AuthCheckResponse(authenticated=False, user=None)
    return AuthCheckResponse(
        authenticated=True,
        user=UserResponse(
            id=str(user.id),
            email=user.email,
            created_at=user.created_at,
            full_name=user.full_name,
            profile_picture=user.profile_picture,
            role=user.role
        )
    )


@router.post(
    "/refresh",
    response_model=AuthResponse,
    status_code=status.HTTP_200_OK,
    summary="Refresh access token",
    description="Use refresh token from cookie to get a new access token.",
    responses={
        200: {
            "description": "Token refreshed successfully",
            "model": AuthResponse
        },
        401: {
            "description": "Invalid or expired refresh token",
            "model": ErrorResponse
        }
    }
)
def refresh_token(
    request: Request,
    response: Response,
    db: Session = Depends(get_db)
) -> AuthResponse:
    """Refresh the access token using the refresh token from cookies."""
    refresh_token = request.cookies.get("refresh_token")

    if not refresh_token:
        logger.warning("Refresh attempt without refresh token cookie")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No refresh token provided"
        )

    # Decode and validate refresh token
    payload = decode_refresh_token(refresh_token)

    if not payload:
        logger.warning("Refresh attempt with invalid/expired refresh token")
        clear_auth_cookies(response)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token. Please sign in again."
        )

    user_id = payload.get("sub")
    if not user_id:
        logger.warning("Refresh token missing user ID")
        clear_auth_cookies(response)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )

    # Get user from database
    try:
        user_uuid = uuid.UUID(user_id)
        user = db.query(User).filter(User.id == user_uuid).first()
    except ValueError:
        logger.warning(f"Invalid UUID in refresh token: {user_id}")
        clear_auth_cookies(response)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )

    if not user:
        logger.warning(f"Refresh token for non-existent user: {user_id}")
        clear_auth_cookies(response)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )

    if user.is_blocked:
        logger.warning(f"Blocked user attempted token refresh: {user.email}")
        clear_auth_cookies(response)
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account has been blocked. Please contact support."
        )

    # Generate new access token (keep existing refresh token)
    try:
        new_access_token, _ = create_access_token(
            user_id=str(user.id),
            email=user.email
        )

        # Set new access token cookie
        cookie_kwargs = {
            "httponly": True,
            "secure": settings.COOKIE_SECURE,
            "samesite": settings.COOKIE_SAMESITE,
        }
        if settings.COOKIE_DOMAIN:
            cookie_kwargs["domain"] = settings.COOKIE_DOMAIN

        response.set_cookie(
            key="access_token",
            value=new_access_token,
            max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            path="/",
            **cookie_kwargs
        )

        logger.info(f"Token refreshed for user: {user.id}")

    except Exception as e:
        logger.error(f"Token refresh failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to refresh token"
        )

    return AuthResponse(
        success=True,
        message="Token refreshed successfully",
        user=UserResponse(
            id=str(user.id),
            email=user.email,
            created_at=user.created_at,
            role=user.role
        )
    )


@router.post(
    "/logout",
    status_code=status.HTTP_200_OK,
    summary="Logout user",
    description="Clear authentication cookies to log out the user.",
    responses={
        200: {
            "description": "Logout successful"
        }
    }
)
def logout(response: Response):
    """Clear authentication cookies to log out the user."""
    clear_auth_cookies(response)
    logger.info("User logged out")
    return {"success": True, "message": "Logged out successfully"}
