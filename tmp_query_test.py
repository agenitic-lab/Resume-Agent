import sys
import os

# Put backend dir in sys path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))

try:
    from database.connection import get_db, SessionLocal
    from database.models.user import User
    from database.models.run import Run
    from database.models.resume import Resume
    from database.models import MissingSkillsRun
    from sqlalchemy import select, literal_column, func, union_all, desc, cast, String
    
    db = SessionLocal()
    
    def get_unified_activity_query(db, user_id=None):
        q_runs = db.query(
            cast(Run.id, String).label('entity_id'),
            cast(Run.user_id, String).label('user_id'),
            literal_column("'resume_optimization'").label('type'),
            cast(Run.status, String).label('status'),
            Run.created_at.label('created_at')
        )
        if user_id:
            q_runs = q_runs.filter(cast(Run.user_id, String) == str(user_id))

        q_resumes = db.query(
            cast(Resume.id, String).label('entity_id'),
            cast(Resume.user_id, String).label('user_id'),
            literal_column("'resume_creation'").label('type'),
            literal_column("'completed'").label('status'),
            Resume.created_at.label('created_at')
        )
        if user_id:
            q_resumes = q_resumes.filter(cast(Resume.user_id, String) == str(user_id))

        q_missing_skills = db.query(
            cast(MissingSkillsRun.id, String).label('entity_id'),
            cast(MissingSkillsRun.user_id, String).label('user_id'),
            literal_column("'missing_skills_scan'").label('type'),
            literal_column("'completed'").label('status'),
            MissingSkillsRun.created_at.label('created_at')
        )
        if user_id:
            q_missing_skills = q_missing_skills.filter(cast(MissingSkillsRun.user_id, String) == str(user_id))
            
        q_api_keys = db.query(
            cast(User.id, String).label('entity_id'),
            cast(User.id, String).label('user_id'),
            literal_column("'api_key_updated'").label('type'),
            literal_column("'completed'").label('status'),
            User.api_key_updated_at.label('created_at')
        ).filter(User.api_key_updated_at.isnot(None))
        
        if user_id:
            q_api_keys = q_api_keys.filter(cast(User.id, String) == str(user_id))

        combined = union_all(q_runs, q_resumes, q_missing_skills, q_api_keys).subquery('unified_activity')
        return combined

    combined = get_unified_activity_query(db)
    query = db.query(
        combined.c.entity_id,
        combined.c.user_id,
        combined.c.type,
        combined.c.status,
        combined.c.created_at,
        User.email.label('user_email'),
        User.full_name.label('user_full_name')
    ).join(User, combined.c.user_id == cast(User.id, String)).order_by(desc(combined.c.created_at))

    print("Query constructed!")
    print("Testing count:", query.count())
    print("Testing fetch:", query.limit(1).all())
    
    # testing user group counts
    grouped = db.query(
        combined.c.user_id,
        func.count(combined.c.entity_id).label('total_runs'),
        func.max(combined.c.created_at).label('latest_activity')
    ).group_by(combined.c.user_id).subquery('user_stats')
    
    final_users = db.query(
        User.id, User.email, User.full_name, grouped.c.total_runs, grouped.c.latest_activity
    ).join(grouped, cast(User.id, String) == grouped.c.user_id).all()
    print("Grouped users fetch:", final_users)

except Exception as e:
    import traceback
    traceback.print_exc()

print("DONE")
