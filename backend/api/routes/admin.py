import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel

from database.connection import get_db
from database.models.user import User
from database.models.run import Run
from database.models.resume import Resume
from database.models import MissingSkillsRun
from database.models.support import SupportTicket
from schemas.support import SupportTicketResponse, SupportTicketUpdate
from auth.dependencies import get_current_admin
from schemas.auth import UserResponse, PaginatedUserResponse
from sqlalchemy import or_, func, literal_column, cast, String, union_all, desc

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/admin", tags=["Admin"])

class UserRoleUpdate(BaseModel):
    role: str

class UserBlockUpdate(BaseModel):
    is_blocked: bool

class UserTestUpdate(BaseModel):
    is_test_user: bool

@router.get("/users", response_model=PaginatedUserResponse)
def get_all_users(
    page: int = 1,
    size: int = 20,
    search: str = "",
    sort: str = "latest",
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    query = db.query(User)
    
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                User.email.ilike(search_term),
                User.full_name.ilike(search_term)
            )
        )
        
    if sort == 'oldest':
        query = query.order_by(User.created_at.asc())
    else:
        query = query.order_by(User.created_at.desc())
        
    total = query.count()
    skip = (page - 1) * size
    users = query.offset(skip).limit(size).all()
    
    items = [
        UserResponse(
            id=str(user.id),
            email=user.email,
            created_at=user.created_at,
            full_name=user.full_name,
            profile_picture=user.profile_picture,
            role=user.role,
            is_blocked=getattr(user, 'is_blocked', False),
            is_test_user=getattr(user, 'is_test_user', False)
        ) for user in users
    ]
    
    return PaginatedUserResponse(
        items=items,
        total=total,
        page=page,
        size=size
    )

@router.put("/users/{user_id}/role")
def update_user_role(
    user_id: str,
    role_data: UserRoleUpdate,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    if role_data.role not in ['user', 'admin']:
        raise HTTPException(status_code=400, detail="Invalid role")
    
    if str(current_admin.id) == str(user_id):
        raise HTTPException(status_code=400, detail="Cannot change your own role")
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    user.role = role_data.role
    db.commit()
    return {"message": "Role updated successfully", "role": user.role}

@router.put("/users/{user_id}/block")
def update_user_block(
    user_id: str,
    block_data: UserBlockUpdate,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if str(current_admin.id) == str(user_id):
        raise HTTPException(status_code=400, detail="Cannot block your own account")
        
    user.is_blocked = block_data.is_blocked
    db.commit()
    
    status_msg = "blocked" if user.is_blocked else "unblocked"
    return {"message": f"User {status_msg} successfully", "is_blocked": user.is_blocked}

@router.put("/users/{user_id}/test-user")
def update_user_test_status(
    user_id: str,
    data: UserTestUpdate,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.is_test_user = data.is_test_user
    db.commit()

    status_msg = "enabled" if user.is_test_user else "disabled"
    return {"message": f"Test user access {status_msg}", "is_test_user": user.is_test_user}

@router.delete("/users/{user_id}")
def delete_user(
    user_id: str,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if str(current_admin.id) == str(user_id):
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
        
    # Optional: Delete associated runs/data directly
    db.query(Run).filter(Run.user_id == user.id).delete()
    db.delete(user)
    db.commit()
    return {"message": "User deleted successfully"}

@router.get("/metrics")
def get_admin_metrics(
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    from datetime import datetime, timedelta, timezone
    
    total_users = db.query(User).count()
    total_admins = db.query(User).filter(User.role == 'admin').count()
    total_blocked_users = db.query(User).filter(User.is_blocked == True).count()
    total_runs = db.query(Run).count()
    
    # New users in the last 30 days
    thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)
    new_users = db.query(User).filter(User.created_at >= thirty_days_ago).count()
    
    failed_runs = db.query(Run).filter(Run.status == 'failed').count()
    
    # recent activity for charts (last 100 runs)
    recent_runs = db.query(Run).order_by(desc(Run.created_at)).limit(100).all()
    recent_activity = [
        {"created_at": r.created_at.isoformat() if r.created_at else None, "status": r.status.value if hasattr(r.status, 'value') else str(r.status)}
        for r in recent_runs
    ]
    
    return {
        "total_users": total_users,
        "total_admins": total_admins,
        "total_blocked_users": total_blocked_users,
        "new_users_30d": new_users,
        "total_resumes_generated": total_runs,
        "failed_runs": failed_runs,
        "recent_activity": recent_activity
    }

def get_unified_activity_query(db: Session, user_id=None, is_global=False):
    queries = []

    if not is_global:
        q_runs = db.query(
            cast(Run.id, String).label('entity_id'),
            cast(Run.user_id, String).label('user_id'),
            literal_column("'resume_optimization'").label('type'),
            cast(Run.status, String).label('status'),
            Run.created_at.label('created_at')
        )
        if user_id:
            q_runs = q_runs.filter(cast(Run.user_id, String) == str(user_id))
        queries.append(q_runs)

        q_resumes = db.query(
            cast(Resume.id, String).label('entity_id'),
            cast(Resume.user_id, String).label('user_id'),
            literal_column("'resume_creation'").label('type'),
            literal_column("'completed'").label('status'),
            Resume.created_at.label('created_at')
        )
        if user_id:
            q_resumes = q_resumes.filter(cast(Resume.user_id, String) == str(user_id))
        queries.append(q_resumes)

        q_missing_skills = db.query(
            cast(MissingSkillsRun.id, String).label('entity_id'),
            cast(MissingSkillsRun.user_id, String).label('user_id'),
            literal_column("'missing_skills_scan'").label('type'),
            literal_column("'completed'").label('status'),
            MissingSkillsRun.created_at.label('created_at')
        )
        if user_id:
            q_missing_skills = q_missing_skills.filter(cast(MissingSkillsRun.user_id, String) == str(user_id))
        queries.append(q_missing_skills)
        
        q_api_keys = db.query(
            cast(User.id, String).label('entity_id'),
            cast(User.id, String).label('user_id'),
            literal_column("'api_key_updated'").label('type'),
            literal_column("'completed'").label('status'),
            User.api_key_updated_at.label('created_at')
        ).filter(User.api_key_updated_at.isnot(None))
        
        if user_id:
            q_api_keys = q_api_keys.filter(cast(User.id, String) == str(user_id))
        queries.append(q_api_keys)

    # Global events
    q_new_users = db.query(
        cast(User.id, String).label('entity_id'),
        cast(User.id, String).label('user_id'),
        literal_column("'new_user_registered'").label('type'),
        literal_column("'completed'").label('status'),
        User.created_at.label('created_at')
    )
    if user_id:
        q_new_users = q_new_users.filter(cast(User.id, String) == str(user_id))
    queries.append(q_new_users)

    if not queries:
        return None

    combined = union_all(*queries).subquery('unified_activity')
    return combined

@router.get("/activity/global")
def get_admin_activity_global(
    page: int = 1,
    size: int = 5,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Fetch paginated global system logs across all users."""
    combined = get_unified_activity_query(db, is_global=True)
    query = db.query(
        combined.c.entity_id,
        combined.c.user_id,
        combined.c.type,
        combined.c.status,
        combined.c.created_at,
        User.email.label('user_email'),
        User.full_name.label('user_full_name')
    ).outerjoin(User, combined.c.user_id == cast(User.id, String)).order_by(desc(combined.c.created_at))
    
    total = query.count()
    skip = (page - 1) * size
    items = query.offset(skip).limit(size).all()
    
    results = []
    for item in items:
        results.append({
            "id": item.entity_id,
            "user_id": item.user_id,
            "user_email": item.user_email,
            "user_full_name": item.user_full_name,
            "type": item.type,
            "status": item.status,
            "created_at": item.created_at
        })
        
    return {
        "items": results,
        "total": total,
        "page": page,
        "size": size
    }

@router.get("/activity/details/{activity_type}/{entity_id}")
def get_admin_activity_details(
    activity_type: str,
    entity_id: str,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Fetch specific details for an activity log."""
    import uuid
    try:
        parsed_uuid = uuid.UUID(entity_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid entity ID format")

    if activity_type == "resume_optimization":
        run = db.query(Run).filter(Run.id == parsed_uuid).first()
        if not run:
            raise HTTPException(status_code=404, detail="Run not found")
        return {
            "job_description": run.job_description,
            "original_resume_text": run.original_resume_text,
            "optimized_resume_path": run.optimized_resume_path,
            "result_data": run.result_json,
            "cover_letter": run.result_json.get("cover_letter", "") if run.result_json else ""
        }
    elif activity_type == "resume_creation":
        resume = db.query(Resume).filter(Resume.id == parsed_uuid).first()
        if not resume:
            raise HTTPException(status_code=404, detail="Resume not found")
        return {
            "field": resume.field,
            "experience_level": resume.experience_level,
            "contact": resume.contact,
            "experience": resume.experience,
            "education": resume.education,
            "projects": resume.projects,
            "skills": resume.skills
        }
    elif activity_type == "missing_skills_scan":
        scan = db.query(MissingSkillsRun).filter(MissingSkillsRun.id == parsed_uuid).first()
        if not scan:
            raise HTTPException(status_code=404, detail="Scan not found")
        return {
            "resume_snippet": scan.resume_snippet,
            "jds_analyzed": scan.jds_analyzed,
            "total_missing_skills": scan.total_missing,
            "results": scan.result_json
        }
    elif activity_type == "api_key_updated":
        return {
            "details": "User updated their API key. No external data captured for security reasons."
        }
    elif activity_type == "new_user_registered":
        user = db.query(User).filter(User.id == parsed_uuid).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        return {
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role,
            "created_at": user.created_at.isoformat()
        }

    else:
        raise HTTPException(status_code=400, detail="Invalid activity type")

@router.get("/activity/users")
def get_admin_activity_users(
    page: int = 1,
    size: int = 15,
    search: str = "",
    sort: str = "latest",
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Fetch a paginated list of users showing their total unified activities and latest activity date."""
    combined = get_unified_activity_query(db)
    
    grouped = db.query(
        combined.c.user_id,
        func.count(combined.c.entity_id).label('total_runs'),
        func.max(combined.c.created_at).label('latest_activity')
    ).group_by(combined.c.user_id).subquery('user_stats')
    
    query = db.query(
        User.id,
        User.email,
        User.full_name,
        grouped.c.total_runs,
        grouped.c.latest_activity
    ).join(grouped, cast(User.id, String) == grouped.c.user_id)
    
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                User.email.ilike(search_term),
                User.full_name.ilike(search_term)
            )
        )
        
    if sort == 'oldest':
        query = query.order_by(grouped.c.latest_activity.asc())
    else:
        query = query.order_by(desc(grouped.c.latest_activity))

    total_users_with_activity = query.count()
    skip = (page - 1) * size
    users_with_activity = query.offset(skip).limit(size).all()
    
    items = []
    for user_data in users_with_activity:
        items.append({
            "user_id": str(user_data.id),
            "email": user_data.email,
            "full_name": user_data.full_name,
            "total_runs": user_data.total_runs, # maintaining API contract for now, but semantically 'total_activities'
            "latest_activity": user_data.latest_activity
        })
        
    return {
        "items": items,
        "total": total_users_with_activity,
        "page": page,
        "size": size
    }

@router.get("/activity/users/{user_id}")
def get_admin_activity_user_details(
    user_id: str,
    page: int = 1,
    size: int = 15,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Fetch paginated unified activity logs for a specific user."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    combined = get_unified_activity_query(db, user_id=user_id)
    
    query = db.query(
        combined.c.entity_id,
        combined.c.type,
        combined.c.status,
        combined.c.created_at
    ).order_by(desc(combined.c.created_at))
    
    total_runs = query.count()
    skip = (page - 1) * size
    runs = query.offset(skip).limit(size).all()
    
    items = []
    for run in runs:
        items.append({
            "id": run.entity_id,
            "type": run.type,
            "status": run.status,
            "created_at": run.created_at,
        })
        
    return {
        "user_email": user.email,
        "user_full_name": user.full_name,
        "items": items,
        "total": total_runs,
        "page": page,
        "size": size
    }

import os
from fastapi import Body

TEMPLATES_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "templates")

from pydantic import BaseModel
from typing import List
import json

from database.models.system_setting import SystemSetting


# ── DB-backed settings helpers ───────────────────────────────────────────────

def _get_setting(db: Session, key: str, default=None):
    """Read a JSON value from the system_settings table."""
    row = db.query(SystemSetting).filter(SystemSetting.key == key).first()
    return row.value if row else default


def _set_setting(db: Session, key: str, value):
    """Write a JSON value to the system_settings table (upsert)."""
    row = db.query(SystemSetting).filter(SystemSetting.key == key).first()
    if row:
        row.value = value
    else:
        row = SystemSetting(key=key, value=value)
        db.add(row)
    db.commit()


def _load_admin_templates(db: Session) -> dict:
    return _get_setting(db, "admin_templates", {})


def _save_admin_templates(db: Session, templates_dict: dict):
    _set_setting(db, "admin_templates", templates_dict)


def _load_deleted_templates(db: Session) -> list:
    return _get_setting(db, "deleted_templates", [])


def _save_deleted_templates(db: Session, deleted: list):
    _set_setting(db, "deleted_templates", deleted)


# ── Admin Templates ──────────────────────────────────────────────────────────

class AdminTemplateUpdate(BaseModel):
    name: str = None
    description: str = None
    tags: List[str] = None
    preamble: str

@router.get("/templates")
def get_admin_templates(
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """List all created admin custom templates."""
    return _load_admin_templates(db)

@router.get("/templates/{template_id}")
def get_admin_template_content(
    template_id: str,
    current_admin: User = Depends(get_current_admin)
):
    """Get content of an admin custom template."""
    from services.latex_templates import get_combined_templates
    combined = get_combined_templates()
    if template_id not in combined:
        raise HTTPException(status_code=404, detail="Template not found")

    tpl = combined[template_id]
    return {
        "id": template_id,
        "content": tpl.get("preamble", ""),
        "name": tpl.get("name", template_id),
        "description": tpl.get("description", ""),
        "tags": tpl.get("tags", []),
    }

@router.put("/templates/{template_id}")
def update_admin_template(
    template_id: str,
    update_data: AdminTemplateUpdate,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Update or create an admin custom LaTeX template."""
    templates = _load_admin_templates(db)

    # Preserve existing metadata if updating
    existing = templates.get(template_id, {})

    templates[template_id] = {
        "id": template_id,
        "name": update_data.name or existing.get("name", template_id),
        "description": update_data.description or existing.get("description", "Admin Custom Template"),
        "author": existing.get("author", "Admin"),
        "source": "System (Admin Built-in)",
        "preview_color": existing.get("preview_color", "#805AD5"), # brand color
        "tags": update_data.tags if update_data.tags is not None else existing.get("tags", ["admin-custom"]),
        "is_admin_custom": True,
        "preamble": update_data.preamble
    }

    _save_admin_templates(db, templates)
    return {"message": "Template saved successfully", "id": template_id}

@router.delete("/templates/{template_id}")
def delete_admin_template(
    template_id: str,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Delete an admin custom template or built-in template."""
    from services.latex_templates import get_combined_templates

    combined = get_combined_templates()
    if template_id not in combined:
        raise HTTPException(status_code=404, detail="Template not found")

    templates = _load_admin_templates(db)
    if template_id in templates:
        del templates[template_id]
        _save_admin_templates(db, templates)
    else:
        deleted = _load_deleted_templates(db)
        if template_id not in deleted:
            deleted.append(template_id)
            _save_deleted_templates(db, deleted)

    return {"message": "Template deleted successfully"}


# ── Global Default Template ──────────────────────────────────────────────────

class DefaultTemplateUpdate(BaseModel):
    template_id: str

@router.get("/default-template")
def get_default_template(
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    return _get_setting(db, "default_template", {"template_id": None})

@router.put("/default-template")
def set_default_template(
    body: DefaultTemplateUpdate,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    from services.latex_templates import get_combined_templates
    combined = get_combined_templates()
    if body.template_id not in combined:
        raise HTTPException(status_code=404, detail="Template not found in available templates")

    _set_setting(db, "default_template", {"template_id": body.template_id})
    return {"message": "Default template updated", "template_id": body.template_id}


# ── Maintenance Mode ──────────────────────────────────────────────────────────

def _load_maintenance(db: Session) -> dict:
    return _get_setting(db, "maintenance", {"active": False})

# Public — no auth required so the frontend can always check
@router.get("/maintenance-status")
def get_maintenance_status(db: Session = Depends(get_db)):
    """Return current maintenance mode status (public endpoint)."""
    return _load_maintenance(db)

class MaintenanceUpdate(BaseModel):
    active: bool

@router.put("/maintenance")
def set_maintenance_mode(
    body: MaintenanceUpdate,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Enable or disable maintenance mode (admin only)."""
    _set_setting(db, "maintenance", {"active": body.active})
    state = "enabled" if body.active else "disabled"
    return {"message": f"Maintenance mode {state}", "active": body.active}


# ── Support Tickets ──────────────────────────────────────────────────────────

@router.get("/support", response_model=List[SupportTicketResponse])
def get_all_support_tickets(
    status: str = None,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """List all support tickets with optional status filter."""
    query = db.query(SupportTicket).order_by(desc(SupportTicket.created_at))
    if status and status != 'all':
        query = query.filter(SupportTicket.status == status)
    return query.all()

@router.patch("/support/{ticket_id}", response_model=SupportTicketResponse)
def update_support_ticket_status(
    ticket_id: str,
    update_data: SupportTicketUpdate,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Update support ticket status."""
    import uuid
    try:
        parsed_uuid = uuid.UUID(ticket_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid ticket ID format")
        
    ticket = db.query(SupportTicket).filter(SupportTicket.id == parsed_uuid).first()
    if not ticket:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Support ticket not found")
        
    ticket.status = update_data.status
    db.commit()
    db.refresh(ticket)
    return ticket
