import logging
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from typing import List

from database.connection import get_db
from database.models.support import SupportTicket
from database.models.user import User
from schemas.support import SupportTicketCreate, SupportTicketResponse
from services.email import send_support_email
from auth.dependencies import get_current_user_optional

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/support", tags=["Support"])

@router.post("", response_model=SupportTicketResponse, status_code=status.HTTP_201_CREATED)
def create_support_ticket(
    ticket_in: SupportTicketCreate,
    current_user: User = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    """
    Submit a new support ticket.
    """
    user_id = current_user.id if current_user else None

    # 1. Save to Database
    db_ticket = SupportTicket(
        user_id=user_id,
        name=ticket_in.name,
        email=ticket_in.email,
        subject=ticket_in.subject,
        message=ticket_in.message,
        status="open"
    )
    db.add(db_ticket)
    db.commit()
    db.refresh(db_ticket)

    # 2. Send Email (non-blocking - ticket saved regardless)
    try:
        email_sent = send_support_email(
            name=db_ticket.name,
            email=db_ticket.email,
            subject=db_ticket.subject,
            message=db_ticket.message
        )
        if not email_sent:
            logger.warning(f"Ticket {db_ticket.id} created, but email notification failed (SMTP issue)")
    except Exception as e:
        logger.warning(f"Ticket {db_ticket.id} created, but email error: {str(e)}")
        email_sent = False

    return {
        "id": db_ticket.id,
        "user_id": db_ticket.user_id,
        "name": db_ticket.name,
        "email": db_ticket.email,
        "subject": db_ticket.subject,
        "message": db_ticket.message,
        "status": db_ticket.status,
        "email_sent": email_sent,
        "created_at": db_ticket.created_at,
        "updated_at": db_ticket.updated_at,
    }
