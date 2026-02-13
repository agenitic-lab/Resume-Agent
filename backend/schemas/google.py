"""
Google OAuth Schemas

Pydantic models for Google OAuth authentication.
"""
from typing import Optional
from pydantic import BaseModel, EmailStr, Field, ConfigDict


class GoogleLoginRequest(BaseModel):
    """Google OAuth login request with ID token."""
    
    credential: str = Field(
        ...,
        description="Google ID token (JWT) from Google Sign-In",
        examples=["eyJhbGciOiJSUzI1NiIsImtpZCI6IjE4MmU..."]
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "credential": "eyJhbGciOiJSUzI1NiIsImtpZCI6IjE4MmU..."
            }
        }
    )


class GoogleUserInfo(BaseModel):
    """User information extracted from Google token."""
    
    google_id: str = Field(
        ...,
        description="Google user ID (sub claim)",
        examples=["108123456789012345678"]
    )
    email: EmailStr = Field(
        ...,
        description="User's email address",
        examples=["user@gmail.com"]
    )
    email_verified: bool = Field(
        ...,
        description="Whether email is verified by Google",
        examples=[True]
    )
    full_name: Optional[str] = Field(
        None,
        description="User's full name",
        examples=["John Doe"]
    )
    profile_picture: Optional[str] = Field(
        None,
        description="URL to user's profile picture",
        examples=["https://lh3.googleusercontent.com/a/..."]
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "google_id": "108123456789012345678",
                "email": "john.doe@gmail.com",
                "email_verified": True,
                "full_name": "John Doe",
                "profile_picture": "https://lh3.googleusercontent.com/a/..."
            }
        }
    )
