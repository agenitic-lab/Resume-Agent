from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from database.connection import get_db
from database.models.user import User
from schemas.auth import RegisterRequest
from core.security import hash_password

router = APIRouter(prefix="/api/auth", tags=["Auth"])


@router.post("/register")
def register_user(
    data: RegisterRequest,
    db: Session = Depends(get_db)
):
    
    hashed_password = hash_password(data.password)

    user = User(
        email=data.email,
        password_hash=hashed_password
    )

    db.add(user)

    try:
        db.commit()
        db.refresh(user)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    return {
        "user_id": str(user.id)
    }
