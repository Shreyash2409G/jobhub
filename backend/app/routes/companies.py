import re

from flask import Blueprint, g, jsonify, request
from sqlalchemy import func

from ..auth_utils import recruiter_company, roles_required
from ..extensions import db
from ..models import Company, Job
from ..utils import Check, json_error

bp = Blueprint("companies", __name__)
URL_RE = re.compile(r"^https?://\S+\.\S+$")


def _open_job_counts():
    return dict(
        db.session.query(Job.company_id, func.count(Job.id))
        .filter(Job.status == "Open", Job.is_deleted.is_(False))
        .group_by(Job.company_id)
        .all()
    )


def _values(data):
    c = Check(data)
    values = {
        "name": c.text("name", "Company name", 2, 80),
        "industry": c.text("industry", "Industry", 2, 100),
        "location": c.text("location", "Location", 2, 100),
        "website": c.text("website", "Website", 4, 255, required=False),
        "description": c.text("description", "Description", 30, 800),
    }
    if values["website"] and not URL_RE.match(values["website"]):
        c.fail("website", "Enter a full link starting with http:// or https://")
    c.done()
    return values


@bp.get("/companies")
def list_companies():
    term = (request.args.get("q") or "").strip()
    query = Company.query.filter(Company.is_deleted.is_(False))
    if term:
        like = f"%{term.replace('%', '').replace('_', '')}%"
        query = query.filter(Company.name.ilike(like) | Company.industry.ilike(like))
    counts = _open_job_counts()
    return jsonify([c.to_dict(counts.get(c.id, 0)) for c in query.order_by(Company.name).all()])


@bp.get("/companies/me")
@roles_required("recruiter")
def my_company():
    """The recruiter's own company (404 until they create one). Addition to the plan's endpoint list."""
    company = recruiter_company(g.current_user)
    if company is None:
        return json_error("You have not created a company profile yet.", 404)
    return jsonify(company.to_dict(_open_job_counts().get(company.id, 0)))


@bp.get("/companies/<int:company_id>")
def get_company(company_id):
    company = Company.query.filter_by(id=company_id, is_deleted=False).first()
    if company is None:
        return json_error("Company not found.", 404)
    return jsonify(company.to_dict(_open_job_counts().get(company.id, 0)))


@bp.post("/companies")
@roles_required("recruiter")
def create_company():
    if recruiter_company(g.current_user):
        return json_error("You already have a company profile. Use PUT /api/companies to update it.", 409)
    company = Company(recruiter_id=g.current_user.id, **_values(request.get_json(silent=True)))
    db.session.add(company)
    db.session.commit()
    return jsonify(company.to_dict(0)), 201


@bp.put("/companies")
@roles_required("recruiter")
def update_company():
    company = recruiter_company(g.current_user)
    if company is None:
        return json_error("Create your company profile first.", 404)
    data = request.get_json(silent=True) or {}
    current = {k: getattr(company, k) for k in ("name", "industry", "location", "website", "description")}
    for key, value in _values({**current, **data}).items():
        setattr(company, key, value)
    db.session.commit()
    return jsonify(company.to_dict(_open_job_counts().get(company.id, 0)))
