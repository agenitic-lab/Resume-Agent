"""
Authentication Middleware

FastAPI middleware for JWT authentication.
This file provides the auth dependency as specified in AG-31 acceptance criteria.

Note: The actual implementation is in auth/dependencies.py for better organization.
This file re-exports it to match the acceptance criteria path.
"""
from auth.dependencies import get_current_user, get_current_user_optional, AuthenticationError

# Export the main auth dependency
auth = get_current_user

__all__ = [
    "auth",
    "get_current_user",
    "get_current_user_optional",
    "AuthenticationError"
]
