"""Logic used by more than one route file."""
from sqlalchemy import func

from .extensions import db
from .models import ApplicationHistory, Notification, Skill
from .utils import utcnow


def notify(user_id, type_, message):
    """Queue a notification; the caller commits."""
    db.session.add(Notification(user_id=user_id, type=type_, message=message[:255]))


def change_status(application, status):
    """Set a new status and record it in the history (timeline). The caller commits."""
    application.status = status
    application.updated_at = utcnow()
    application.history.append(ApplicationHistory(status=status))


def get_or_create_skills(names):
    """Skill names (any case) -> Skill rows, creating the ones that do not exist yet."""
    cleaned = {}
    for name in names:
        name = name.strip()
        if name:
            cleaned.setdefault(name.lower(), name)
    if not cleaned:
        return []
    existing = {s.name.lower(): s for s in Skill.query.filter(func.lower(Skill.name).in_(list(cleaned))).all()}
    for lowered, name in cleaned.items():
        if lowered not in existing:
            existing[lowered] = Skill(name=name[:50])
            db.session.add(existing[lowered])
    db.session.flush()
    return [existing[lowered] for lowered in cleaned]
