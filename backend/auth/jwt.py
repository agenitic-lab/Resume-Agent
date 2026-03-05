# JWT token creation and validation
from datetime import datetime, timedelta
from typing import Optional, Dict, Tuple

import jwt
from config import settings

JWT_SECRET = settings.JWT_SECRET_KEY
JWT_ALGORITHM = settings.JWT_ALGORITHM
ACCESS_TOKEN_EXPIRE_MINUTES = settings.ACCESS_TOKEN_EXPIRE_MINUTES  # 30 min default
REFRESH_TOKEN_EXPIRE_DAYS = settings.REFRESH_TOKEN_EXPIRE_DAYS      # 7 days default

if not JWT_SECRET:
    raise ValueError("JWT_SECRET_KEY is not set in environment variables")


def create_access_token(user_id: str, email: str) -> Tuple[str, int]:
    """Create a short-lived access token (default 30 minutes)."""
    expires_in_seconds = ACCESS_TOKEN_EXPIRE_MINUTES * 60
    expires_at = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)

    payload = {
        "sub": user_id,
        "email": email,
        "type": "access",
        "iat": datetime.utcnow(),
        "exp": expires_at,
    }

    token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return token, expires_in_seconds


def create_refresh_token(user_id: str, email: str) -> Tuple[str, int]:
    """Create a long-lived refresh token (default 7 days)."""
    expires_in_seconds = REFRESH_TOKEN_EXPIRE_DAYS * 86400
    expires_at = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)

    payload = {
        "sub": user_id,
        "email": email,
        "type": "refresh",
        "iat": datetime.utcnow(),
        "exp": expires_at,
    }

    token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return token, expires_in_seconds


def decode_access_token(token: str) -> Optional[Dict]:
    """Decode and validate an access token. Returns payload or None."""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        # Reject refresh tokens used as access tokens
        if payload.get("type") == "refresh":
            return None
        return payload
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError, Exception):
        return None


def decode_refresh_token(token: str) -> Optional[Dict]:
    """Decode and validate a refresh token. Returns payload or None."""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "refresh":
            return None
        return payload
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError, Exception):
        return None
