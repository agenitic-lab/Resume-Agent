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
from schemas.support import SupportTicketResponse, SupportTicketUpdate, SupportTicketMarkRead, SupportTicketReply
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
    try:
        db.commit()
    except Exception:
        db.rollback()
        logger.exception("Failed to update role for user %s", user_id)
        raise HTTPException(status_code=500, detail="Failed to update user role")
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
    try:
        db.commit()
    except Exception:
        db.rollback()
        logger.exception("Failed to update block status for user %s", user_id)
        raise HTTPException(status_code=500, detail="Failed to update block status")

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
    try:
        db.commit()
    except Exception:
        db.rollback()
        logger.exception("Failed to update test user status for user %s", user_id)
        raise HTTPException(status_code=500, detail="Failed to update test user status")

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
    try:
        db.query(Run).filter(Run.user_id == user.id).delete()
        db.delete(user)
        db.commit()
    except Exception:
        db.rollback()
        logger.exception("Failed to delete user %s", user_id)
        raise HTTPException(status_code=500, detail="Failed to delete user")
    return {"message": "User deleted successfully"}

@router.get("/metrics")
def get_admin_metrics(
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    from datetime import datetime, timedelta, timezone

    thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)

    # Single query for all user-related counts
    user_stats = db.query(
        func.count(User.id).label('total'),
        func.count(User.id).filter(User.role == 'admin').label('admins'),
        func.count(User.id).filter(User.is_blocked == True).label('blocked'),
        func.count(User.id).filter(User.created_at >= thirty_days_ago).label('new_30d'),
    ).first()

    # Single query for run-related counts
    run_stats = db.query(
        func.count(Run.id).label('total'),
        func.count(Run.id).filter(Run.status == 'failed').label('failed'),
    ).first()

    # recent activity for charts (last 100 runs) - only fetch needed columns
    recent_runs = db.query(Run.created_at, Run.status).order_by(desc(Run.created_at)).limit(100).all()
    recent_activity = [
        {"created_at": r.created_at.isoformat() if r.created_at else None, "status": r.status.value if hasattr(r.status, 'value') else str(r.status)}
        for r in recent_runs
    ]

    return {
        "total_users": user_stats.total,
        "total_admins": user_stats.admins,
        "total_blocked_users": user_stats.blocked,
        "new_users_30d": user_stats.new_30d,
        "total_resumes_generated": run_stats.total,
        "failed_runs": run_stats.failed,
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
        # Strip sensitive keys (e.g. user API keys) that may exist in older rows
        _SENSITIVE_KEYS = {"user_llm_api_key"}
        sanitized_result = (
            {k: v for k, v in run.result_json.items() if k not in _SENSITIVE_KEYS}
            if run.result_json else None
        )
        return {
            "job_description": run.job_description,
            "original_resume_text": run.original_resume_text,
            "optimized_resume_path": run.optimized_resume_path,
            "result_data": sanitized_result,
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
    preamble: str  # Accepts full LaTeX document OR preamble-only


def _split_latex_document(full_latex: str) -> tuple:
    """Split a full LaTeX document into (preamble, example_body).

    If the string contains \\begin{document}...\\end{document}, everything
    before \\begin{document} is the preamble and everything between
    \\begin{document} and \\end{document} is the example body.

    If there is no \\begin{document}, the whole string is treated as a
    preamble-only template (backward compatible).
    """
    import re
    begin_match = re.search(r'\\begin\{document\}', full_latex)
    if not begin_match:
        # No document body — treat as preamble-only
        return full_latex.strip(), None

    preamble = full_latex[:begin_match.start()].strip()
    body_start = begin_match.end()

    end_match = re.search(r'\\end\{document\}', full_latex[body_start:])
    if end_match:
        example_body = full_latex[body_start:body_start + end_match.start()].strip()
    else:
        example_body = full_latex[body_start:].strip()

    return preamble, example_body if example_body else None

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
    """Get content of an admin custom template.

    Returns the full LaTeX document (preamble + body recombined) so the
    admin can edit it as a single piece of code in the editor.
    """
    from services.latex_templates import get_combined_templates
    combined = get_combined_templates()
    if template_id not in combined:
        raise HTTPException(status_code=404, detail="Template not found")

    tpl = combined[template_id]

    # Recombine preamble + example_body into a full document for editing
    preamble = tpl.get("preamble", "")
    example_body = tpl.get("example_body", "")
    if example_body:
        content = preamble + "\n\n\\begin{document}\n\n" + example_body + "\n\n\\end{document}\n"
    else:
        content = preamble

    return {
        "id": template_id,
        "content": content,
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
    """Update or create an admin custom LaTeX template.

    The admin may paste either:
      - A full LaTeX document (\\documentclass ... \\end{document})
      - A preamble-only snippet (packages + custom commands, no body)

    If a full document is provided the backend auto-splits it into the
    preamble (styling/packages) and an example body (structure reference
    that the LLM uses to replicate the layout for new resumes).
    """
    templates = _load_admin_templates(db)

    # Preserve existing metadata if updating
    existing = templates.get(template_id, {})

    # Auto-split full document into preamble + example body
    preamble, example_body = _split_latex_document(update_data.preamble)

    template_data = {
        "id": template_id,
        "name": update_data.name or existing.get("name", template_id),
        "description": update_data.description or existing.get("description", "Admin Custom Template"),
        "author": existing.get("author", "Admin"),
        "source": "System (Admin Built-in)",
        "preview_color": existing.get("preview_color", "#805AD5"),  # brand color
        "tags": update_data.tags if update_data.tags is not None else existing.get("tags", ["admin-custom"]),
        "is_admin_custom": True,
        "preamble": preamble,
    }

    if example_body:
        template_data["example_body"] = example_body
    elif existing.get("example_body") and "\\begin{document}" not in update_data.preamble:
        # Preserve existing example_body when admin edits only the preamble
        template_data["example_body"] = existing["example_body"]

    templates[template_id] = template_data

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

@router.get("/support/unread/count")
def get_unread_support_count(
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Get count of unread support tickets."""
    unread_count = db.query(SupportTicket).filter(SupportTicket.is_read == False).count()
    return {"unread_count": unread_count}

@router.get("/support", response_model=List[SupportTicketResponse])
def get_all_support_tickets(
    status: str = None,
    limit: int = 100,
    skip: int = 0,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """List all support tickets with optional status filter and pagination.
    
    Args:
        status: Filter by ticket status (open, in_progress, closed, or 'all')
        limit: Maximum number of tickets to return (default 100, max 500)
        skip: Number of tickets to skip for pagination (default 0)
    """
    # Cap the limit to prevent loading too much data at once
    limit = min(limit, 500)
    
    query = db.query(SupportTicket).order_by(desc(SupportTicket.created_at))
    if status and status != 'all':
        query = query.filter(SupportTicket.status == status)
    
    # Apply pagination
    return query.offset(skip).limit(limit).all()

@router.patch("/support/{ticket_id}/read", response_model=SupportTicketResponse)
def mark_support_ticket_read(
    ticket_id: str,
    mark_data: SupportTicketMarkRead,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Mark support ticket as read or unread."""
    import uuid
    try:
        parsed_uuid = uuid.UUID(ticket_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid ticket ID format")
        
    ticket = db.query(SupportTicket).filter(SupportTicket.id == parsed_uuid).first()
    if not ticket:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Support ticket not found")
        
    ticket.is_read = mark_data.is_read
    db.commit()
    db.refresh(ticket)
    return ticket

@router.delete("/support/{ticket_id}")
def delete_support_ticket(
    ticket_id: str,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Delete a support ticket."""
    import uuid
    try:
        parsed_uuid = uuid.UUID(ticket_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid ticket ID format")
        
    ticket = db.query(SupportTicket).filter(SupportTicket.id == parsed_uuid).first()
    if not ticket:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Support ticket not found")
        
    db.delete(ticket)
    db.commit()
    return {"message": "Support ticket deleted successfully"}

@router.post("/support/{ticket_id}/reply")
def reply_support_ticket(
    ticket_id: str,
    reply_data: SupportTicketReply,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Send a reply to a support ticket via email."""
    import uuid
    from services.email import send_support_reply
    
    try:
        parsed_uuid = uuid.UUID(ticket_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid ticket ID format")
        
    ticket = db.query(SupportTicket).filter(SupportTicket.id == parsed_uuid).first()
    if not ticket:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Support ticket not found")
    
    # Send reply email
    email_sent = send_support_reply(
        ticket_subject=ticket.subject,
        user_email=ticket.email,
        user_name=ticket.name,
        reply_message=reply_data.reply_message
    )
    
    if not email_sent:
        raise HTTPException(status_code=500, detail="Failed to send reply email")
    
    # Mark ticket as read and replied after replying
    ticket.is_read = True
    ticket.is_replied = True
    db.commit()
    db.refresh(ticket)
    
    return {"message": "Reply sent successfully", "ticket": ticket}

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
    try:
        db.commit()
        db.refresh(ticket)
    except Exception:
        db.rollback()
        logger.exception("Failed to update support ticket %s", ticket_id)
        raise HTTPException(status_code=500, detail="Failed to update ticket status")
    return ticket
