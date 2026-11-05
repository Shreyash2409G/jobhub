from flask import Blueprint, g, jsonify, request
from sqlalchemy import and_, func, or_

from ..auth_utils import can_manage_job, recruiter_company, roles_required
from ..constants import (EXPERIENCE_BANDS, JOB_STATUSES, JOB_TYPES, SALARY_BANDS, SORT_OPTIONS, WORK_MODES)
from ..extensions import db
from ..models import Application, Category, Company, Job, Report, Skill
from ..services import get_or_create_skills
from ..utils import Check, ValidationError, iso, json_error, utcnow

bp = Blueprint("jobs", __name__)

JOB_FIELDS = ("title", "description", "responsibilities", "requirements", "benefits", "location", "jobType",
              "experience", "workMode", "salaryMin", "salaryMax", "applicationDeadline", "categoryId", "skills")


# ---------------------------------------------------------------- helpers
def _multi(name, allowed):
    """?jobType=Full Time&jobType=Contract  or  ?jobType=Full Time,Contract  ->  ['Full Time', 'Contract']"""
    values = []
    for raw in request.args.getlist(name):
        values += [part.strip() for part in raw.split(",") if part.strip()]
    return [v for v in values if v in allowed]


def _int_arg(name, default, minimum, maximum):
    try:
        value = int(request.args.get(name, default))
    except (TypeError, ValueError):
        value = default
    return max(minimum, min(maximum, value))


def _terms(keyword):
    return [t for t in (keyword or "").lower().replace("%", " ").replace("_", " ").split() if t]


def _relevance(job, terms):
    """Keyword match (title 5, skill 3, company 1 per word) plus up to 2 points for recent postings."""
    score = 0
    for term in terms:
        score += (5 if term in job.title.lower() else 0)
        score += (3 if any(term in s.name.lower() for s in job.skills) else 0)
        score += (1 if term in job.company.name.lower() else 0)
    age_days = (utcnow() - job.posted_date).days
    return score + max(0.0, 2 - age_days / 15)


def _job_as_input(job):
    """A job in the same shape as the request body, so PUT can merge partial changes."""
    return {
        "title": job.title, "description": job.description, "responsibilities": job.responsibilities or [],
        "requirements": job.requirements or [], "benefits": job.benefits or [], "location": job.location,
        "jobType": job.job_type, "experience": job.experience, "workMode": job.work_mode,
        "salaryMin": job.salary_min, "salaryMax": job.salary_max, "applicationDeadline": iso(job.application_deadline),
        "categoryId": job.category_id, "skills": [s.name for s in job.skills],
    }


def _validated_job_values(data):
    data = dict(data)
    # skills may be ["Angular"] or [{"id": 1, "name": "Angular"}]
    if isinstance(data.get("skills"), list):
        data["skills"] = [s.get("name") if isinstance(s, dict) else s for s in data["skills"]]

    c = Check(data)
    values = {
        "title": c.text("title", "Job title", 3, 100),
        "description": c.text("description", "Description", 30, 5000),
        "responsibilities": c.text_list("responsibilities", "Responsibilities", min_items=1),
        "requirements": c.text_list("requirements", "Requirements", min_items=1),
        "benefits": c.text_list("benefits", "Benefits"),
        "location": c.text("location", "Location", 2, 100),
        "job_type": c.choice("jobType", JOB_TYPES, "Job type"),
        "experience": c.choice("experience", EXPERIENCE_BANDS, "Experience"),
        "work_mode": c.choice("workMode", WORK_MODES, "Work mode"),
        "salary_min": c.integer("salaryMin", "Minimum salary", 0, 500),
        "salary_max": c.integer("salaryMax", "Maximum salary", 0, 500),
        "application_deadline": c.moment("applicationDeadline", "Application deadline"),
    }
    category_id = c.integer("categoryId", "Category", 1)
    skill_names = c.text_list("skills", "Skills", min_items=1, max_items=15, max_len=50)
    if values["salary_min"] is not None and values["salary_max"] is not None and values["salary_max"] < values["salary_min"]:
        c.fail("salaryMax", "Maximum salary must be at least the minimum.")
    c.done()

    category = db.session.get(Category, category_id)
    if category is None:
        raise ValidationError({"categoryId": "Choose a valid category."})
    values["category_id"] = category.id
    return values, skill_names


def _apply_values(job, values, skill_names):
    for key, value in values.items():
        setattr(job, key, value)
    job.skills = get_or_create_skills(skill_names)


# ---------------------------------------------------------------- public
@bp.get("/jobs")
def list_jobs():
    """Search, filter, sort and paginate. The total count comes back in the X-Total-Count header."""
    args = request.args
    terms = _terms(args.get("keyword"))
    query = (Job.query.join(Company, Job.company_id == Company.id)
             .filter(Job.is_deleted.is_(False), Company.is_deleted.is_(False), Job.status == "Open"))

    for term in terms:  # every word must match the title, the company or a skill
        like = f"%{term}%"
        query = query.filter(or_(Job.title.ilike(like), Company.name.ilike(like), Job.skills.any(Skill.name.ilike(like))))

    location = (args.get("location") or "").strip()
    if location:
        query = query.filter(func.lower(Job.location) == location.lower())
    category = args.get("category", type=int)
    if category:
        query = query.filter(Job.category_id == category)
    company_id = args.get("company", type=int)
    if company_id:
        query = query.filter(Job.company_id == company_id)

    job_types, experiences, work_modes = _multi("jobType", JOB_TYPES), _multi("experience", EXPERIENCE_BANDS), _multi("workMode", WORK_MODES)
    if job_types:
        query = query.filter(Job.job_type.in_(job_types))
    if experiences:
        query = query.filter(Job.experience.in_(experiences))
    if work_modes:
        query = query.filter(Job.work_mode.in_(work_modes))
    bands = _multi("salary", SALARY_BANDS)
    if bands:
        query = query.filter(or_(*[and_(Job.salary_max > SALARY_BANDS[b][0], Job.salary_min < SALARY_BANDS[b][1]) for b in bands]))

    sort = args.get("sort") if args.get("sort") in SORT_OPTIONS else "newest"
    page, limit = _int_arg("page", 1, 1, 10_000), _int_arg("limit", 10, 1, 50)
    offset = (page - 1) * limit

    if sort == "relevance":
        jobs = sorted(query.all(), key=lambda j: _relevance(j, terms), reverse=True)
        total, items = len(jobs), jobs[offset:offset + limit]
    else:
        order = {
            "newest": (Job.posted_date.desc(), Job.id.desc()),
            "salary_asc": (Job.salary_min.asc(), Job.salary_max.asc(), Job.id.desc()),
            "salary_desc": (Job.salary_max.desc(), Job.salary_min.desc(), Job.id.desc()),
        }[sort]
        total = query.count()
        items = query.order_by(*order).offset(offset).limit(limit).all()

    response = jsonify([job.to_dict() for job in items])
    response.headers["X-Total-Count"] = str(total)
    return response


@bp.get("/jobs/mine")
@roles_required("recruiter")
def my_jobs():
    """All of the recruiter's jobs, open and closed, with applicant counts. Addition to the plan's endpoint list."""
    company = recruiter_company(g.current_user)
    if company is None:
        return jsonify([])
    jobs = Job.query.filter_by(company_id=company.id, is_deleted=False).order_by(Job.posted_date.desc()).all()
    counts = {}
    if jobs:
        counts = dict(db.session.query(Application.job_id, func.count(Application.id))
                      .filter(Application.job_id.in_([j.id for j in jobs])).group_by(Application.job_id).all())
    return jsonify([{**j.to_dict(), "applicantCount": counts.get(j.id, 0)} for j in jobs])


@bp.get("/jobs/<int:job_id>")
def get_job(job_id):
    job = Job.query.filter_by(id=job_id, is_deleted=False).first()
    if job is None:
        return json_error("Job not found.", 404)
    return jsonify(job.to_dict())


@bp.get("/jobs/<int:job_id>/similar")
def similar_jobs(job_id):
    """Open jobs that share the most skills (plus the same category)."""
    job = Job.query.filter_by(id=job_id, is_deleted=False).first()
    if job is None:
        return json_error("Job not found.", 404)
    mine = {s.id for s in job.skills}
    candidates = Job.query.filter(Job.id != job.id, Job.is_deleted.is_(False), Job.status == "Open").all()
    scored = [(len(mine & {s.id for s in j.skills}) + (1 if j.category_id == job.category_id else 0), j) for j in candidates]
    scored = [pair for pair in scored if pair[0] > 0]
    scored.sort(key=lambda pair: pair[0], reverse=True)
    return jsonify([j.to_dict() for _, j in scored[:3]])


@bp.post("/jobs/<int:job_id>/report")
@roles_required("candidate")
def report_job(job_id):
    """A candidate flags a job (fake, misleading ...). Admins review it under Reports."""
    job = Job.query.filter_by(id=job_id, is_deleted=False).first()
    if job is None:
        return json_error("Job not found.", 404)
    c = Check(request.get_json(silent=True))
    reason = c.text("reason", "Reason", 5, 255)
    c.done()
    if Report.query.filter_by(job_id=job.id, reporter_id=g.current_user.id, status="Open").first():
        return json_error("You have already reported this job.", 409)
    db.session.add(Report(job_id=job.id, reporter_id=g.current_user.id, reason=reason))
    db.session.commit()
    return jsonify(message="Thank you. Our team will review this job."), 201


# ---------------------------------------------------------------- recruiter
@bp.post("/jobs")
@roles_required("recruiter")
def create_job():
    company = recruiter_company(g.current_user)
    if company is None:
        return json_error("Create your company profile before posting a job.", 409)
    values, skill_names = _validated_job_values(request.get_json(silent=True) or {})
    if values["application_deadline"] <= utcnow():
        raise ValidationError({"applicationDeadline": "Deadline must be in the future."})

    job = Job(company_id=company.id, status="Open")
    _apply_values(job, values, skill_names)
    db.session.add(job)
    db.session.commit()
    return jsonify(job.to_dict()), 201


@bp.put("/jobs/<int:job_id>")
@roles_required("recruiter", "admin")
def update_job(job_id):
    """Send only the fields that change. {"status": "Closed"} closes the job, {"status": "Open"} reopens it."""
    job = Job.query.filter_by(id=job_id, is_deleted=False).first()
    if job is None:
        return json_error("Job not found.", 404)
    if not can_manage_job(g.current_user, job):
        return json_error("You can only change your own company's jobs.", 403)

    data = request.get_json(silent=True) or {}
    status = data.get("status")
    if status is not None and status not in JOB_STATUSES:
        raise ValidationError({"status": f"Status must be one of: {', '.join(JOB_STATUSES)}."})

    merged = {**_job_as_input(job), **{k: v for k, v in data.items() if k in JOB_FIELDS}}
    values, skill_names = _validated_job_values(merged)
    if "applicationDeadline" in data and values["application_deadline"] <= utcnow():
        raise ValidationError({"applicationDeadline": "Deadline must be in the future."})
    if status == "Open" and values["application_deadline"] <= utcnow():
        raise ValidationError({"applicationDeadline": "The deadline has passed. Set a new deadline to reopen the job."})

    _apply_values(job, values, skill_names)
    if status:
        job.status = status
    db.session.commit()
    return jsonify(job.to_dict())


@bp.delete("/jobs/<int:job_id>")
@roles_required("recruiter", "admin")
def delete_job(job_id):
    """Soft delete: the job disappears from JobHub but old applications still resolve."""
    job = Job.query.filter_by(id=job_id, is_deleted=False).first()
    if job is None:
        return json_error("Job not found.", 404)
    if not can_manage_job(g.current_user, job):
        return json_error("You can only delete your own company's jobs.", 403)
    job.is_deleted = True
    db.session.commit()
    return "", 204
