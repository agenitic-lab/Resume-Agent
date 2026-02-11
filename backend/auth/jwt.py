"""
JWT Utilities

Handles creation and validation of JWT access tokens.
Provides secure token generation with configurable expiration.
"""
import os
from datetime import datetime, timedelta
from typing import Optional, Dict, Tuple

import jwt
from dotenv import load_dotenv

load_dotenv()

# Configuration from environment variables
JWT_SECRET = os.getenv("JWT_SECRET")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
JWT_EXPIRY_HOURS = int(os.getenv("JWT_EXPIRY_HOURS", "24"))

if not JWT_SECRET:
    raise ValueError("JWT_SECRET is not set in environment variables")


def create_access_token(user_id: str, email: str) -> Tuple[str, int]:
    """
    Generate JWT access token.
    
    Args:
        user_id: User's unique identifier (UUID as string)
        email: User's email address
        
    Returns:
        Tuple of (token_string, expires_in_seconds)
        
    Example:
        >>> token, expires_in = create_access_token("user-123", "user@example.com")
        >>> print(f"Token expires in {expires_in} seconds")
    """
    # Calculate expiration
    expires_at = datetime.utcnow() + timedelta(hours=JWT_EXPIRY_HOURS)
    expires_in_seconds = JWT_EXPIRY_HOURS * 3600

    # Create payload
    payload = {
        "sub": user_id,      # Subject (user ID) - standard JWT claim
        "email": email,       # Custom claim
        "iat": datetime.utcnow(),  # Issued at - standard JWT claim
        "exp": expires_at,    # Expiration - standard JWT claim
    }

    # Encode token
    token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

    return token, expires_in_seconds


def decode_access_token(token: str) -> Optional[Dict]:
    """
    Decode and validate JWT token.
    
    Args:
        token: JWT token string to decode
        
    Returns:
        Decoded payload dictionary if valid, None if invalid/expired
        
    Example:
        >>> payload = decode_access_token(token)
        >>> if payload:
        >>>     user_id = payload["sub"]
        >>>     email = payload["email"]
    """
    try:
        payload = jwt.decode(
            token,
            JWT_SECRET,
            algorithms=[JWT_ALGORITHM]
        )
        return payload

    except jwt.ExpiredSignatureError:
        # Token has expired
        return None

    except jwt.InvalidTokenError:
        # Token is invalid (malformed, wrong signature, etc.)
        return None
    
    except Exception:
        # Catch any other unexpected errors
        return None
