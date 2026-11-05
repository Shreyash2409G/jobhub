from flask import Blueprint, g, jsonify, request
from sqlalchemy.exc import IntegrityError

from ..auth_utils import can_manage_job, login_required, recruiter_company, roles_required
from ..constants import APPLICATION_STATUSES, NEXT_STATUS
from ..extensions import db
from ..models import Application, Job, Resume
from ..services import change_status, notify
from ..utils import Check, ValidationError, json_error, utcnow

bp = Blueprint("applications", __name__)


def _find_job(job_id):
    return Job.query.filter_by(id=job_id, is_deleted=False).first()


@bp.post("/applications")
@roles_required("candidate")
def apply():
    c = Check(request.get_json(silent=True))
    job_id = c.integer("jobId", "Job", 1)
    c.done()

    user = g.current_user
    job = _find_job(job_id)
    if job is None:
        return json_error("Job not found.", 404)
    if job.status != "Open" or job.application_deadline <= utcnow():
        return json_error("This job is closed.", 400)
    if Application.query.filter_by(candidate_id=user.id, job_id=job.id).first():
        return json_error("You have already applied for this job.", 409)

    resume = Resume.query.filter_by(user_id=user.id, is_active=True).order_by(Resume.id.desc()).first()
    application = Application(job_id=job.id, candidate_id=user.id, resume_id=resume.id if resume else None)
    change_status(application, "Applied")
    db.session.add(application)
    notify(user.id, "application", f"You applied for {job.title} at {job.company.name}.")
    notify(job.company.recruiter_id, "application", f"New application received for {job.title} from {user.name}.")
    try:
        db.session.commit()  # the UNIQUE(candidate_id, job_id) constraint also protects against double clicks
    except IntegrityError:
        db.session.rollback()
        return json_error("You have already applied for this job.", 409)
    return jsonify(application.to_dict(with_job=True)), 201


@bp.get("/applications/my")
@roles_required("candidate")
def my_applications():
    apps = Application.query.filter_by(candidate_id=g.current_user.id).order_by(Application.applied_at.desc()).all()
    return jsonify([a.to_dict(with_job=True) for a in apps])


@bp.get("/applications/received")
@roles_required("recruiter")
def received_applications():
    """Every application to the recruiter's company, with the candidate and the job. Addition to the plan's list."""
    company = recruiter_company(g.current_user)
    if company is None:
        return jsonify([])
    apps = (Application.query.join(Job, Application.job_id == Job.id)
            .filter(Job.company_id == company.id, Job.is_deleted.is_(False))
            .order_by(Application.applied_at.desc()).all())
    return jsonify([a.to_dict(with_job=True, with_candidate=True) for a in apps])


@bp.get("/applications/<int:application_id>")
@login_required
def get_application(application_id):
    """One application: its candidate, or the recruiter who owns the job. Addition to the plan's endpoint list."""
    application = db.session.get(Application, application_id)
    if application is None:
        return json_error("Application not found.", 404)
    user = g.current_user
    is_owner = application.candidate_id == user.id
    if not (is_owner or can_manage_job(user, application.job)):
        return json_error("You do not have access to this application.", 403)
    return jsonify(application.to_dict(with_job=True, with_candidate=not is_owner))


@bp.get("/jobs/<int:job_id>/applications")
@roles_required("recruiter", "admin")
def job_applications(job_id):
    job = _find_job(job_id)
    if job is None:
        return json_error("Job not found.", 404)
    if not can_manage_job(g.current_user, job):
        return json_error("You can only view applicants for your own company's jobs.", 403)
    apps = Application.query.filter_by(job_id=job.id).order_by(Application.applied_at.desc()).all()
    return jsonify([a.to_dict(with_job=True, with_candidate=True) for a in apps])


@bp.put("/applications/<int:application_id>/status")
@roles_required("recruiter", "admin")
def update_status(application_id):
    application = db.session.get(Application, application_id)
    if application is None:
        return json_error("Application not found.", 404)
    if not can_manage_job(g.current_user, application.job):
        return json_error("You can only update applicants of your own company's jobs.", 403)

    c = Check(request.get_json(silent=True))
    status = c.choice("status", APPLICATION_STATUSES, "Status")
    c.done()
    if status == "Interview":
        raise ValidationError({"status": "Schedule an interview with POST /api/applications/<id>/interview instead."})
    if status not in NEXT_STATUS[application.status]:
        return json_error(f"An application that is '{application.status}' cannot move to '{status}'.", 409)

    job = application.job
    change_status(application, status)
    messages = {
        "Under Review": f"Your application for {job.title} is under review.",
        "Shortlisted": f"Your application for {job.title} has been shortlisted.",
        "Selected": f"Congratulations! You were selected for {job.title} at {job.company.name}.",
        "Rejected": f"Update on your {job.title} application at {job.company.name}.",
    }
    notify(application.candidate_id, "application", messages[status])
    db.session.commit()
    return jsonify(application.to_dict(with_job=True, with_candidate=True))
