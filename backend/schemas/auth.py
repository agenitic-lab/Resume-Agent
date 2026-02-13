# schemas for auth endpoints
from typing import Optional
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field, ConfigDict


class RegisterRequest(BaseModel):
    
    email: EmailStr = Field(
        ...,
        description="User's email address",
        examples=["user@example.com"]
    )
    password: str = Field(
        ...,
        min_length=8,
        max_length=100,
        description="User password (min 8 characters)",
        examples=["SecurePass123!"]
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "email": "john.doe@example.com",
                "password": "MySecurePassword123!"
            }
        }
    )


class LoginRequest(BaseModel):
    
    email: EmailStr = Field(
        ...,
        description="User's email address",
        examples=["user@example.com"]
    )
    password: str = Field(
        ...,
        min_length=1,
        max_length=100,
        description="User password",
        examples=["SecurePass123!"]
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "email": "john.doe@example.com",
                "password": "MySecurePassword123!"
            }
        }
    )


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

    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "example": {
                "id": "123e4567-e89b-12d3-a456-426614174000",
                "email": "john.doe@example.com",
                "created_at": "2024-01-15T10:30:00Z"
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


class RegisterResponse(BaseModel):
    
    user_id: str = Field(
        ...,
        description="Newly created user's unique identifier",
        examples=["123e4567-e89b-12d3-a456-426614174000"]
    )
    email: str = Field(
        ...,
        description="Registered email address",
        examples=["user@example.com"]
    )
    message: str = Field(
        default="User registered successfully",
        description="Success message",
        examples=["User registered successfully"]
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "user_id": "123e4567-e89b-12d3-a456-426614174000",
                "email": "john.doe@example.com",
                "message": "User registered successfully"
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
