from flask import Blueprint, jsonify
from sqlalchemy import func

from ..extensions import db
from ..models import Category, Company, Job, Skill

bp = Blueprint("meta", __name__)


@bp.get("/health")
def health():
    db.session.execute(db.text("SELECT 1"))
    return jsonify(status="ok")


@bp.get("/categories")
def categories():
    """Used by the home page and the job filters. Addition to the plan's endpoint list."""
    counts = dict(
        db.session.query(Job.category_id, func.count(Job.id))
        .filter(Job.status == "Open", Job.is_deleted.is_(False))
        .group_by(Job.category_id)
        .all()
    )
    return jsonify([{**c.to_dict(), "jobCount": counts.get(c.id, 0)} for c in Category.query.order_by(Category.id).all()])


@bp.get("/stats")
def stats():
    """Numbers shown on the home page. Addition to the plan's endpoint list."""
    open_jobs = (Job.status == "Open", Job.is_deleted.is_(False))
    return jsonify(
        openJobs=Job.query.filter(*open_jobs).count(),
        companies=Company.query.filter(Company.is_deleted.is_(False)).count(),
        cities=db.session.query(func.count(func.distinct(Job.location))).filter(*open_jobs).scalar() or 0,
        categories=Category.query.count(),
    )


@bp.get("/skills")
def skills():
    return jsonify([s.to_dict() for s in Skill.query.order_by(Skill.name).all()])
