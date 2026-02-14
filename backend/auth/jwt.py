# JWT token creation and validation
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
    # generate JWT token with expiration
    # returns (token_string, expires_in_seconds)
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
    # decode and validate JWT token
    # returns payload dict if valid, None if expired/invalid
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
