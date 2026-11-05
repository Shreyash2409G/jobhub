"""Admin-only endpoints: platform numbers, user/company/job moderation, categories and reports."""
from datetime import timedelta

from flask import Blueprint, jsonify, request
from sqlalchemy import and_, func, or_

from ..auth_utils import roles_required
from ..constants import APPLICATION_STATUSES, JOB_STATUSES, ROLES
from ..extensions import db
from ..models import Application, ApplicationHistory, Category, Company, Job, Report, User
from ..services import notify
from ..utils import Check, ValidationError, iso, json_error, utcnow

bp = Blueprint("admin", __name__)
admin_only = roles_required("admin")


# ---------------------------------------------------------------- helpers
def _like(term):
    return f"%{term.replace('%', '').replace('_', '')}%"


def _int_arg(name, default, minimum, maximum):
    try:
        value = int(request.args.get(name, default))
    except (TypeError, ValueError):
        value = default
    return max(minimum, min(maximum, value))


def _paged(query, serialize):
    """One page of rows; the total comes back in the X-Total-Count header (same as GET /api/jobs)."""
    page, limit = _int_arg("page", 1, 1, 10_000), _int_arg("limit", 8, 1, 50)
    total = query.count()
    rows = query.offset((page - 1) * limit).limit(limit).all()
    response = jsonify([serialize(row) for row in rows])
    response.headers["X-Total-Count"] = str(total)
    return response


def _bool_field(data, key):
    value = data.get(key)
    if value is not None and not isinstance(value, bool):
        raise ValidationError({key: "Must be true or false."})
    return value


# ---------------------------------------------------------------- dashboard
@bp.get("/admin/stats")
@admin_only
def stats():
    live_jobs = Job.is_deleted.is_(False)

    # "Funnel": how many applications passed through each stage (every status change is in application_history)
    reached = dict(
        db.session.query(ApplicationHistory.status, func.count(func.distinct(ApplicationHistory.application_id)))
        .group_by(ApplicationHistory.status).all()
    )
    stages = [s for s in APPLICATION_STATUSES if s != "Rejected"]

    by_category = (
        db.session.query(Category.name, func.count(Job.id))
        .outerjoin(Job, and_(Job.category_id == Category.id, live_jobs))
        .group_by(Category.id, Category.name).order_by(Category.id).all()
    )
    by_role = dict(db.session.query(User.role, func.count(User.id)).group_by(User.role).all())

    today = utcnow().date()
    since = today - timedelta(days=13)
    per_day = {
        str(day): count
        for day, count in db.session.query(func.date(Application.applied_at), func.count(Application.id))
        .filter(Application.applied_at >= since).group_by(func.date(Application.applied_at)).all()
    }
    days = [str(since + timedelta(days=i)) for i in range(14)]

    return jsonify({
        "totals": {
            "users": User.query.count(),
            "recruiters": by_role.get("recruiter", 0),
            "companies": Company.query.filter(Company.is_deleted.is_(False)).count(),
            "jobs": Job.query.filter(live_jobs).count(),
            "applications": Application.query.count(),
            "openReports": Report.query.filter_by(status="Open").count(),
        },
        "funnel": [{"status": s, "count": reached.get(s, 0)} for s in stages],
        "rejected": reached.get("Rejected", 0),
        "jobsByCategory": [{"name": name, "count": count} for name, count in by_category],
        "usersByRole": [{"role": r, "count": by_role.get(r, 0)} for r in ROLES],
        "applicationsPerDay": [{"date": d, "count": per_day.get(d, 0)} for d in days],
    })


# ---------------------------------------------------------------- users and recruiters
def _user_row(user):
    row = {**user.to_dict(), "isActive": user.is_active}
    if user.role == "recruiter":
        company = Company.query.filter_by(recruiter_id=user.id).first()
        row["companyName"] = company.name if company else None
        row["jobCount"] = Job.query.filter_by(company_id=company.id, is_deleted=False).count() if company else 0
    return row


@bp.get("/admin/users")
@admin_only
def list_users():
    """?q= searches name and email, ?role= filters. The Recruiters page uses ?role=recruiter."""
    query = User.query
    role = request.args.get("role")
    if role in ROLES:
        query = query.filter(User.role == role)
    term = (request.args.get("q") or "").strip()
    if term:
        query = query.filter(or_(User.name.ilike(_like(term)), User.email.ilike(_like(term))))
    return _paged(query.order_by(User.created_at.desc(), User.id.desc()), _user_row)


@bp.put("/admin/users/<int:user_id>")
@admin_only
def update_user(user_id):
    user = db.session.get(User, user_id)
    if user is None:
        return json_error("User not found.", 404)
    is_active = _bool_field(request.get_json(silent=True) or {}, "isActive")
    if is_active is None:
        raise ValidationError({"isActive": "isActive is required."})
    if user.role == "admin":
        return json_error("Admin accounts cannot be deactivated here.", 409)
    user.is_active = is_active
    db.session.commit()
    return jsonify(_user_row(user))


# ---------------------------------------------------------------- companies
def _company_row(company):
    live = Job.query.filter_by(company_id=company.id, is_deleted=False)
    recruiter = db.session.get(User, company.recruiter_id)
    return {**company.to_dict(live.filter(Job.status == "Open").count()), "isDeleted": company.is_deleted,
            "recruiterName": recruiter.name, "recruiterEmail": recruiter.email, "jobCount": live.count()}


@bp.get("/admin/companies")
@admin_only
def list_companies():
    """?q= searches company, industry and recruiter email. ?status=Active|Removed."""
    query = Company.query.join(User, Company.recruiter_id == User.id)
    term = (request.args.get("q") or "").strip()
    if term:
        like = _like(term)
        query = query.filter(or_(Company.name.ilike(like), Company.industry.ilike(like), User.email.ilike(like)))
    status = request.args.get("status")
    if status in ("Active", "Removed"):
        query = query.filter(Company.is_deleted.is_(status == "Removed"))
    return _paged(query.order_by(Company.name), _company_row)


@bp.put("/admin/companies/<int:company_id>")
@admin_only
def update_company(company_id):
    """{"isDeleted": true} removes a company from JobHub (soft delete), false brings it back."""
    company = db.session.get(Company, company_id)
    if company is None:
        return json_error("Company not found.", 404)
    is_deleted = _bool_field(request.get_json(silent=True) or {}, "isDeleted")
    if is_deleted is None:
        raise ValidationError({"isDeleted": "isDeleted is required."})
    if is_deleted and not company.is_deleted:
        notify(company.recruiter_id, "system", f'Your company "{company.name}" was removed by an administrator.')
    company.is_deleted = is_deleted
    db.session.commit()
    return jsonify(_company_row(company))


# ---------------------------------------------------------------- jobs
def _job_row(job):
    return {**job.to_dict(), "isDeleted": job.is_deleted,
            "applicantCount": Application.query.filter_by(job_id=job.id).count(),
            "openReports": Report.query.filter_by(job_id=job.id, status="Open").count()}


@bp.get("/admin/jobs")
@admin_only
def list_jobs():
    """?q= searches title and company. ?status=Open|Closed|Removed (Removed = soft-deleted)."""
    query = Job.query.join(Company, Job.company_id == Company.id)
    term = (request.args.get("q") or "").strip()
    if term:
        query = query.filter(or_(Job.title.ilike(_like(term)), Company.name.ilike(_like(term))))
    status = request.args.get("status")
    if status == "Removed":
        query = query.filter(Job.is_deleted.is_(True))
    elif status in JOB_STATUSES:
        query = query.filter(Job.is_deleted.is_(False), Job.status == status)
    return _paged(query.order_by(Job.posted_date.desc(), Job.id.desc()), _job_row)


@bp.put("/admin/jobs/<int:job_id>")
@admin_only
def update_job(job_id):
    """{"status": "Closed"|"Open"} and/or {"isDeleted": true|false}. The recruiter is notified."""
    job = db.session.get(Job, job_id)
    if job is None:
        return json_error("Job not found.", 404)
    data = request.get_json(silent=True) or {}
    c = Check(data)
    status = c.choice("status", JOB_STATUSES, "Status", required=False)
    c.done()
    is_deleted = _bool_field(data, "isDeleted")
    if status is None and is_deleted is None:
        raise ValidationError({"status": "Send status and/or isDeleted."})
    if status == "Open" and job.application_deadline <= utcnow():
        raise ValidationError({"status": "The deadline has passed. The recruiter must set a new deadline first."})

    recruiter_id = job.company.recruiter_id
    if status == "Closed" and job.status != "Closed":
        notify(recruiter_id, "system", f'Your job "{job.title}" was closed by an administrator.')
    if is_deleted is True and not job.is_deleted:
        notify(recruiter_id, "system", f'Your job "{job.title}" was removed by an administrator.')
    if status:
        job.status = status
    if is_deleted is not None:
        job.is_deleted = is_deleted
    db.session.commit()
    return jsonify(_job_row(job))


# ---------------------------------------------------------------- categories
@bp.post("/admin/categories")
@admin_only
def create_category():
    c = Check(request.get_json(silent=True))
    name = c.text("name", "Name", 2, 80)
    icon = c.text("icon", "Icon", 2, 40, required=False)
    c.done()
    if Category.query.filter(func.lower(Category.name) == name.lower()).first():
        return json_error("A category with this name already exists.", 409)
    category = Category(name=name, icon=icon)
    db.session.add(category)
    db.session.commit()
    return jsonify({**category.to_dict(), "jobCount": 0}), 201


@bp.put("/admin/categories/<int:category_id>")
@admin_only
def update_category(category_id):
    category = db.session.get(Category, category_id)
    if category is None:
        return json_error("Category not found.", 404)
    data = request.get_json(silent=True) or {}
    c = Check({"name": data.get("name", category.name), "icon": data.get("icon", category.icon)})
    name = c.text("name", "Name", 2, 80)
    icon = c.text("icon", "Icon", 2, 40, required=False)
    c.done()
    clash = Category.query.filter(func.lower(Category.name) == name.lower(), Category.id != category.id).first()
    if clash:
        return json_error("A category with this name already exists.", 409)
    category.name, category.icon = name, icon
    db.session.commit()
    return jsonify(category.to_dict())


@bp.delete("/admin/categories/<int:category_id>")
@admin_only
def delete_category(category_id):
    category = db.session.get(Category, category_id)
    if category is None:
        return json_error("Category not found.", 404)
    in_use = Job.query.filter_by(category_id=category.id).count()
    if in_use:
        return json_error(f"{in_use} job(s) use this category. Move or remove them first.", 409)
    db.session.delete(category)
    db.session.commit()
    return "", 204


# ---------------------------------------------------------------- reports
def _report_row(report):
    job = db.session.get(Job, report.job_id)
    reporter = db.session.get(User, report.reporter_id)
    return {"id": report.id, "jobId": job.id, "jobTitle": job.title, "jobStatus": job.status, "jobRemoved": job.is_deleted,
            "companyName": job.company.name, "reporterName": reporter.name, "reason": report.reason,
            "status": report.status, "createdAt": iso(report.created_at)}


@bp.get("/admin/reports")
@admin_only
def list_reports():
    """?status=Open|Resolved|Dismissed (all when left out). Newest first."""
    query = Report.query
    status = request.args.get("status")
    if status in ("Open", "Resolved", "Dismissed"):
        query = query.filter(Report.status == status)
    return _paged(query.order_by(Report.created_at.desc(), Report.id.desc()), _report_row)


@bp.put("/admin/reports/<int:report_id>")
@admin_only
def review_report(report_id):
    """{"status": "Resolved"|"Dismissed", "closeJob": true} (closeJob is optional and only for Resolved)."""
    report = db.session.get(Report, report_id)
    if report is None:
        return json_error("Report not found.", 404)
    data = request.get_json(silent=True) or {}
    c = Check(data)
    status = c.choice("status", ("Resolved", "Dismissed"), "Status")
    c.done()
    close_job = _bool_field(data, "closeJob") is True
    if report.status != "Open":
        return json_error(f"This report is already {report.status.lower()}.", 409)

    report.status = status
    job = db.session.get(Job, report.job_id)
    if status == "Resolved" and close_job and job.status != "Closed":
        job.status = "Closed"
        notify(job.company.recruiter_id, "system", f'Your job "{job.title}" was closed after a report was reviewed.')
    db.session.commit()
    return jsonify(_report_row(report))
