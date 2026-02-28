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
from auth.dependencies import get_current_admin
from schemas.auth import UserResponse, PaginatedUserResponse
from sqlalchemy import or_, func, literal_column, cast, String, union_all, desc

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/admin", tags=["Admin"])

class UserRoleUpdate(BaseModel):
    role: str

class UserBlockUpdate(BaseModel):
    is_blocked: bool

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
            is_blocked=getattr(user, 'is_blocked', False)
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
        
    user.is_blocked = block_data.is_blocked
    db.commit()
    
    status_msg = "blocked" if user.is_blocked else "unblocked"
    return {"message": f"User {status_msg} successfully", "is_blocked": user.is_blocked}

@router.delete("/users/{user_id}")
def delete_user(
    user_id: str,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
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
    
    # Active users in the last 7 days
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
    if is_global or not user_id:
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
import json

ADMIN_TEMPLATES_FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "data", "admin_templates.json")

def load_admin_templates():
    if not os.path.exists(ADMIN_TEMPLATES_FILE):
        return {}
    try:
        with open(ADMIN_TEMPLATES_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception:
        return {}

def save_admin_templates(templates_dict):
    os.makedirs(os.path.dirname(ADMIN_TEMPLATES_FILE), exist_ok=True)
    with open(ADMIN_TEMPLATES_FILE, 'w', encoding='utf-8') as f:
        json.dump(templates_dict, f, indent=2)

class AdminTemplateUpdate(BaseModel):
    name: str = None
    preamble: str

@router.get("/templates")
def get_admin_templates(
    current_admin: User = Depends(get_current_admin)
):
    """List all created admin custom templates."""
    return load_admin_templates()

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
        
    return {"id": template_id, "content": combined[template_id].get("preamble", ""), "name": combined[template_id].get("name", template_id)}

@router.put("/templates/{template_id}")
def update_admin_template(
    template_id: str,
    update_data: AdminTemplateUpdate,
    current_admin: User = Depends(get_current_admin)
):
    """Update or create an admin custom LaTeX template."""
    templates = load_admin_templates()
    
    # Preserve existing metadata if updating
    existing = templates.get(template_id, {})
    
    templates[template_id] = {
        "id": template_id,
        "name": update_data.name or existing.get("name", template_id),
        "description": existing.get("description", "Admin Custom Template"),
        "author": existing.get("author", "Admin"),
        "source": "System (Admin Built-in)",
        "preview_color": existing.get("preview_color", "#805AD5"), # brand color
        "tags": existing.get("tags", ["admin-custom"]),
        "is_admin_custom": True,
        "preamble": update_data.preamble
    }
    
    save_admin_templates(templates)
    return {"message": "Template saved successfully", "id": template_id}

@router.delete("/templates/{template_id}")
def delete_admin_template(
    template_id: str,
    current_admin: User = Depends(get_current_admin)
):
    """Delete an admin custom template."""
    templates = load_admin_templates()
    if template_id not in templates:
        raise HTTPException(status_code=404, detail="Admin Custom Template not found")
        
    del templates[template_id]
    save_admin_templates(templates)
    return {"message": "Template deleted successfully"}


# ── Maintenance Mode ──────────────────────────────────────────────────────────

MAINTENANCE_FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "data", "maintenance.json")

def _load_maintenance() -> dict:
    if not os.path.exists(MAINTENANCE_FILE):
        return {"active": False}
    try:
        with open(MAINTENANCE_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {"active": False}

def _save_maintenance(data: dict):
    os.makedirs(os.path.dirname(MAINTENANCE_FILE), exist_ok=True)
    with open(MAINTENANCE_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f)

# Public — no auth required so the frontend can always check
@router.get("/maintenance-status")
def get_maintenance_status():
    """Return current maintenance mode status (public endpoint)."""
    return _load_maintenance()

class MaintenanceUpdate(BaseModel):
    active: bool

@router.put("/maintenance")
def set_maintenance_mode(
    body: MaintenanceUpdate,
    current_admin: User = Depends(get_current_admin),
):
    """Enable or disable maintenance mode (admin only)."""
    _save_maintenance({"active": body.active})
    state = "enabled" if body.active else "disabled"
    return {"message": f"Maintenance mode {state}", "active": body.active}
