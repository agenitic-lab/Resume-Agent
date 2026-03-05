# JWT token creation and validation
import os
from datetime import datetime, timedelta
from typing import Optional, Dict, Tuple

import jwt
from config import settings

JWT_SECRET = settings.JWT_SECRET_KEY
JWT_ALGORITHM = settings.JWT_ALGORITHM
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "15"))
REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7"))

if not JWT_SECRET:
    raise ValueError("JWT_SECRET_KEY is not set in environment variables")


def create_access_token(user_id: str, email: str) -> Tuple[str, int]:
    """Generate JWT access token with short expiration (15 minutes default).
    Returns (token_string, expires_in_seconds)"""
    expires_at = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    expires_in_seconds = ACCESS_TOKEN_EXPIRE_MINUTES * 60

    payload = {
        "sub": user_id,
        "email": email,
        "type": "access",
        "iat": datetime.utcnow(),
        "exp": expires_at,
    }

    token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return token, expires_in_seconds


def create_refresh_token(user_id: str) -> Tuple[str, int]:
    """Generate JWT refresh token with longer expiration (7 days default).
    Returns (token_string, expires_in_seconds)"""
    expires_at = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    expires_in_seconds = REFRESH_TOKEN_EXPIRE_DAYS * 24 * 3600

    payload = {
        "sub": user_id,
        "type": "refresh",
        "iat": datetime.utcnow(),
        "exp": expires_at,
    }

    token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return token, expires_in_seconds


def decode_access_token(token: str) -> Optional[Dict]:
    """Decode and validate JWT access token.
    Returns payload dict if valid, None if expired/invalid."""
    try:
        payload = jwt.decode(
            token,
            JWT_SECRET,
            algorithms=[JWT_ALGORITHM]
        )
        # Verify it's an access token (not a refresh token)
        # Old tokens without type are treated as access tokens for backward compatibility
        token_type = payload.get("type")
        if token_type is not None and token_type != "access":
            return None
        return payload

    except jwt.ExpiredSignatureError:
        return None

    except jwt.InvalidTokenError:
        return None

    except Exception:
        return None


def decode_refresh_token(token: str) -> Optional[Dict]:
    """Decode and validate JWT refresh token.
    Returns payload dict if valid, None if expired/invalid."""
    try:
        payload = jwt.decode(
            token,
            JWT_SECRET,
            algorithms=[JWT_ALGORITHM]
        )
        # Verify it's a refresh token
        if payload.get("type") != "refresh":
            return None
        return payload

    except jwt.ExpiredSignatureError:
        return None

    except jwt.InvalidTokenError:
        return None

    except Exception:
        return None


def get_token_settings() -> Dict:
    """Return cookie settings for tokens."""
    return {
        "access_token_expire_minutes": ACCESS_TOKEN_EXPIRE_MINUTES,
        "refresh_token_expire_days": REFRESH_TOKEN_EXPIRE_DAYS,
    }
