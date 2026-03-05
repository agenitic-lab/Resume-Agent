# schemas for auth endpoints
from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict


class UserResponse(BaseModel):
    
    id: str = Field(
        ...,
        description="User's unique identifier (UUID)",
        examples=["123e4567-e89b-12d3-a456-426614174000"]
    )
    email: str = Field(
        ...,
        description="User's email address",
        examples=["user@example.com"]
    )
    created_at: datetime = Field(
        ...,
        description="Account creation timestamp",
        examples=["2024-01-15T10:30:00Z"]
    )
    full_name: Optional[str] = Field(
        None,
        description="User's full name",
        examples=["John Doe"]
    )
    profile_picture: Optional[str] = Field(
        None,
        description="URL to user's profile picture",
        examples=["https://lh3.googleusercontent.com/a/ACg8oc..."]
    )
    role: str = Field(
        default="user",
        description="User's role (admin or user)",
        examples=["user", "admin"]
    )

    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "example": {
                "id": "123e4567-e89b-12d3-a456-426614174000",
                "email": "john.doe@example.com",
                "created_at": "2024-01-15T10:30:00Z",
                "full_name": "John Doe",
                "profile_picture": "https://lh3.googleusercontent.com/a/ACg8oc...",
                "role": "user"
            }
        }
    )


class TokenData(BaseModel):
    
    access_token: str = Field(
        ...,
        description="JWT access token",
        examples=["eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."]
    )
    token_type: str = Field(
        default="bearer",
        description="Token type (always 'bearer')",
        examples=["bearer"]
    )
    expires_in: int = Field(
        ...,
        description="Token expiration time in seconds",
        examples=[86400]
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c",
                "token_type": "bearer",
                "expires_in": 86400
            }
        }
    )


class LoginResponse(BaseModel):
    
    access_token: str = Field(
        ...,
        description="JWT access token for authentication",
        examples=["eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."]
    )
    token_type: str = Field(
        default="bearer",
        description="Token type (always 'bearer')",
        examples=["bearer"]
    )
    expires_in: int = Field(
        ...,
        description="Token expiration time in seconds",
        examples=[86400]
    )
    user: UserResponse = Field(
        ...,
        description="Authenticated user information"
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                "token_type": "bearer",
                "expires_in": 86400,
                "user": {
                    "id": "123e4567-e89b-12d3-a456-426614174000",
                    "email": "john.doe@example.com",
                    "created_at": "2024-01-15T10:30:00Z"
                }
            }
        }
    )


class AuthResponse(BaseModel):
    """Secure authentication response - tokens are set in HttpOnly cookies, not in response body."""
    
    success: bool = Field(
        ...,
        description="Whether authentication was successful",
        examples=[True]
    )
    message: str = Field(
        ...,
        description="Status message",
        examples=["Authentication successful"]
    )
    user: UserResponse = Field(
        ...,
        description="Authenticated user information"
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "success": True,
                "message": "Authentication successful",
                "user": {
                    "id": "123e4567-e89b-12d3-a456-426614174000",
                    "email": "john.doe@example.com",
                    "created_at": "2024-01-15T10:30:00Z",
                    "role": "user"
                }
            }
        }
    )


class ErrorDetail(BaseModel):
    
    field: Optional[str] = Field(
        None,
        description="Field that caused the error (if applicable)",
        examples=["email"]
    )
    message: str = Field(
        ...,
        description="Error message",
        examples=["Invalid email format"]
    )
    code: Optional[str] = Field(
        None,
        description="Error code for programmatic handling",
        examples=["INVALID_EMAIL"]
    )


class ErrorResponse(BaseModel):
    
    error: str = Field(
        ...,
        description="Error type or category",
        examples=["ValidationError", "AuthenticationError"]
    )
    message: str = Field(
        ...,
        description="Human-readable error message",
        examples=["Invalid credentials provided"]
    )
    details: Optional[list[ErrorDetail]] = Field(
        None,
        description="Additional error details (if applicable)"
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "error": "AuthenticationError",
                "message": "Invalid email or password",
                "details": None
            }
        }
    )


class ApiKeyUpsertRequest(BaseModel):
    api_key: str = Field(..., min_length=20, max_length=300)


class ApiKeyStatusResponse(BaseModel):
    has_api_key: bool
    updated_at: Optional[datetime] = None


class PaginatedUserResponse(BaseModel):
    items: list[UserResponse] = Field(description="List of users for the current page")
    total: int = Field(description="Total number of users matching the filter")
    page: int = Field(description="Current page number")
    size: int = Field(description="Number of items per page")
