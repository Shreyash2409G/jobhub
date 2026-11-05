from flask import Blueprint, g, jsonify, request

from ..auth_utils import can_manage_job, roles_required
from ..constants import INTERVIEW_MODES
from ..extensions import db
from ..models import Application, Company, Interview, Job
from ..services import change_status, notify
from ..utils import Check, ValidationError, json_error, utcnow

bp = Blueprint("interviews", __name__)


@bp.post("/applications/<int:application_id>/interview")
@roles_required("recruiter")
def schedule_interview(application_id):
    application = db.session.get(Application, application_id)
    if application is None:
        return json_error("Application not found.", 404)
    if not can_manage_job(g.current_user, application.job):
        return json_error("You can only schedule interviews for your own company's jobs.", 403)

    has_open_slot = any(i.status == "Scheduled" for i in Interview.query.filter_by(application_id=application.id))
    if not (application.status == "Shortlisted" or (application.status == "Interview" and not has_open_slot)):
        return json_error("Shortlist the candidate before scheduling an interview.", 409)

    c = Check(request.get_json(silent=True))
    when = c.moment("scheduledAt", "Date and time")
    mode = c.choice("mode", INTERVIEW_MODES, "Mode")
    location = c.text("location", "Location", 2, 255, required=(request.get_json(silent=True) or {}).get("mode") == "On-site")
    c.done()
    if when <= utcnow():
        raise ValidationError({"scheduledAt": "Choose a time in the future."})

    interview = Interview(application_id=application.id, scheduled_at=when, mode=mode, location=location, status="Scheduled")
    db.session.add(interview)
    if application.status != "Interview":
        change_status(application, "Interview")
    job = application.job
    notify(application.candidate_id, "interview",
           f"Interview scheduled for {job.title} at {job.company.name} on {when.strftime('%d %b %Y')}. Open Interviews for the time.")
    db.session.commit()
    return jsonify(interview.to_dict()), 201


@bp.get("/interviews")
@roles_required("candidate", "recruiter")
def list_interviews():
    """Candidates see their own interviews, recruiters see interviews for their company's jobs."""
    user = g.current_user
    query = Interview.query.join(Application, Interview.application_id == Application.id)
    if user.role == "candidate":
        query = query.filter(Application.candidate_id == user.id)
    else:
        query = (query.join(Job, Application.job_id == Job.id).join(Company, Job.company_id == Company.id)
                 .filter(Company.recruiter_id == user.id))
    return jsonify([i.to_dict() for i in query.order_by(Interview.scheduled_at.desc()).all()])


@bp.put("/interviews/<int:interview_id>/status")
@roles_required("recruiter")
def update_interview_status(interview_id):
    interview = db.session.get(Interview, interview_id)
    if interview is None:
        return json_error("Interview not found.", 404)
    application = interview.application
    if not can_manage_job(g.current_user, application.job):
        return json_error("You can only update interviews for your own company's jobs.", 403)

    c = Check(request.get_json(silent=True))
    status = c.choice("status", ("Completed", "Cancelled"), "Status")
    c.done()
    interview.status = status
    if status == "Cancelled":
        notify(application.candidate_id, "interview",
               f"Your interview for {application.job.title} was cancelled. The recruiter will contact you.")
    db.session.commit()
    return jsonify(interview.to_dict())
