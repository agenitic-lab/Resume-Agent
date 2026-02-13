"""
Google OAuth Helper Functions

Handles Google OAuth token verification and user info extraction.
"""
import os
import logging
from typing import Optional
from pathlib import Path
from dotenv import load_dotenv
from google.oauth2 import id_token
from google.auth.transport import requests

from schemas.google import GoogleUserInfo

logger = logging.getLogger(__name__)

# Force load .env from backend root
env_path = Path(__file__).resolve().parent.parent / '.env'
load_dotenv(dotenv_path=env_path, override=True)

# Google OAuth configuration
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")

# Log configuration status (masked)
if GOOGLE_CLIENT_ID:
    masked_id = f"{GOOGLE_CLIENT_ID[:5]}...{GOOGLE_CLIENT_ID[-5:]}"
    logger.info(f"Google OAuth configured with Client ID: {masked_id}")
else:
    logger.error("GOOGLE_CLIENT_ID not found in environment variables")


def verify_google_token(credential: str) -> Optional[GoogleUserInfo]:
    """
    Verify Google ID token and extract user information.
    
    Args:
        credential: Google ID token (JWT) from frontend
        
    Returns:
        GoogleUserInfo object with user data, or None if verification fails
        
    Raises:
        ValueError: If token is invalid or verification fails
    """
    if not GOOGLE_CLIENT_ID:
        logger.error("GOOGLE_CLIENT_ID not configured")
        raise ValueError("Google OAuth is not configured")
    
    try:
        # Verify the token with Google
        idinfo = id_token.verify_oauth2_token(
            credential, 
            requests.Request(), 
            GOOGLE_CLIENT_ID
        )
        
        # Extract user information
        google_id = idinfo.get('sub')
        email = idinfo.get('email')
        email_verified = idinfo.get('email_verified', False)
        full_name = idinfo.get('name')
        profile_picture = idinfo.get('picture')
        
        if not google_id or not email:
            logger.error("Missing required fields in Google token")
            raise ValueError("Invalid token: missing required fields")
        
        if not email_verified:
            logger.warning(f"Email not verified for Google user: {email}")
            raise ValueError("Email not verified by Google")
        
        logger.info(f"Successfully verified Google token for: {email}")
        
        return GoogleUserInfo(
            google_id=google_id,
            email=email,
            email_verified=email_verified,
            full_name=full_name,
            profile_picture=profile_picture
        )
        
    except ValueError as e:
        logger.error(f"Google token verification failed: {str(e)}")
        raise ValueError(f"Invalid Google token: {str(e)}")
    except Exception as e:
        logger.error(f"Unexpected error during token verification: {str(e)}")
        raise ValueError("Failed to verify Google token")
