from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime
from uuid import UUID

class SupportTicketCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    subject: str = Field(..., min_length=3, max_length=200)
    message: str = Field(..., min_length=10)

class SupportTicketResponse(BaseModel):
    id: UUID
    user_id: Optional[UUID] = None
    name: str
    email: EmailStr
    subject: str
    message: str
    status: str
    email_sent: Optional[bool] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class SupportTicketUpdate(BaseModel):
    status: str = Field(..., pattern="^(open|in_progress|closed)$")
