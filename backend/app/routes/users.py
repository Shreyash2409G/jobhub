import os
import re
import uuid

from flask import Blueprint, current_app, g, jsonify, request, send_from_directory
from werkzeug.utils import secure_filename

from ..auth_utils import login_required, roles_required
from ..extensions import db
from ..models import Application, Job, Company, Profile, Resume, SavedJob
from ..services import get_or_create_skills
from ..utils import Check, ValidationError, json_error

bp = Blueprint("users", __name__)

PHONE_RE = re.compile(r"^[6-9]\d{9}$")  # Indian 10-digit mobile number
MONTH_RE = re.compile(r"^\d{4}-(0[1-9]|1[0-2])$")
# Allowed resume types: extension -> the first bytes a genuine file of that type starts with
RESUME_SIGNATURES = {".pdf": b"%PDF", ".docx": b"PK\x03\x04", ".doc": b"\xd0\xcf\x11\xe0"}


# ---------------------------------------------------------------- profile
def _clean_education(items, errors):
    if not isinstance(items, list) or len(items) > 10:
        errors["education"] = "Education must be a list of up to 10 entries."
        return []
    cleaned = []
    for i, item in enumerate(items):
        c = Check(item)
        row = {"degree": c.text("degree", "Degree", 2, 100), "institute": c.text("institute", "Institute", 2, 150),
               "year": c.integer("year", "Year", 1980, 2040)}
        errors.update({f"education[{i}].{k}": v for k, v in c.errors.items()})
        cleaned.append(row)
    return cleaned


def _clean_experience(items, errors):
    if not isinstance(items, list) or len(items) > 10:
        errors["experience"] = "Experience must be a list of up to 10 entries."
        return []
    cleaned = []
    for i, item in enumerate(items):
        c = Check(item)
        row = {"title": c.text("title", "Job title", 2, 100), "company": c.text("company", "Company", 2, 100),
               "from": c.text("from", "Start month", 7, 7), "to": c.text("to", "End month", 7, 7, required=False),
               "description": c.text("description", "Description", 1, 300, required=False)}
        for key in ("from", "to"):
            if row[key] and not MONTH_RE.match(row[key]):
                c.fail(key, "Use the format YYYY-MM.")
        errors.update({f"experience[{i}].{k}": v for k, v in c.errors.items()})
        cleaned.append({k: v for k, v in row.items() if v})
    return cleaned


@bp.get("/users/profile")
@login_required
def get_profile():
    user = g.current_user
    return jsonify({"user": user.to_dict(), "profile": user.profile.to_dict() if user.profile else None})


@bp.put("/users/profile")
@login_required
def update_profile():
    """Send only what changes. Candidates can update the whole profile, everyone can change their name."""
    user = g.current_user
    data = request.get_json(silent=True) or {}
    c = Check(data)
    name = c.text("name", "Name", 2, 100, required=False) if "name" in data else None
    profile_values = {}
    errors = {}
    skill_names = None
    if user.role == "candidate":
        if "headline" in data:
            profile_values["headline"] = c.text("headline", "Headline", 2, 80, required=False)
        if "location" in data:
            profile_values["location"] = c.text("location", "Location", 2, 100, required=False)
        if "about" in data:
            profile_values["about"] = c.text("about", "About", 1, 500, required=False)
        if "phone" in data:
            phone = c.text("phone", "Phone", 10, 10, required=False)
            if phone and not PHONE_RE.match(phone):
                c.fail("phone", "Enter a valid 10-digit mobile number.")
            profile_values["phone"] = phone
        if "skills" in data:
            names = data["skills"]
            if isinstance(names, list):  # accept ["Angular"] or [{"id": 1, "name": "Angular"}]
                data["skills"] = [n.get("name") if isinstance(n, dict) else n for n in names]
            skill_names = c.text_list("skills", "Skills", max_items=15, max_len=50)
        if "education" in data:
            profile_values["education"] = _clean_education(data["education"], errors)
        if "experience" in data:
            profile_values["experience"] = _clean_experience(data["experience"], errors)
    errors = {**c.errors, **errors}
    if errors:
        raise ValidationError(errors)

    if name:
        user.name = name
    if user.role == "candidate":
        profile = user.profile or Profile(user_id=user.id)
        user.profile = profile
        for key, value in profile_values.items():
            setattr(profile, key, value)
        if skill_names is not None:
            profile.skills = get_or_create_skills(skill_names)
    db.session.commit()
    return jsonify({"user": user.to_dict(), "profile": user.profile.to_dict() if user.profile else None})


# ---------------------------------------------------------------- resume
def _active_resume(user_id):
    return Resume.query.filter_by(user_id=user_id, is_active=True).order_by(Resume.id.desc()).first()


@bp.get("/users/resume")
@roles_required("candidate")
def get_resume():
    resume = _active_resume(g.current_user.id)
    return jsonify(resume.to_dict() if resume else None)


@bp.post("/users/resume")
@roles_required("candidate")
def upload_resume():
    """multipart/form-data with a 'file' field. Type, signature and size are checked here, not just in Angular."""
    upload = request.files.get("file")
    if upload is None or not upload.filename:
        return json_error("Choose a file to upload.", 400)

    original = secure_filename(upload.filename) or "resume"
    extension = os.path.splitext(original)[1].lower()
    if extension not in RESUME_SIGNATURES:
        return json_error("Only PDF, DOC or DOCX files are allowed.", 400)
    if not upload.stream.read(8).startswith(RESUME_SIGNATURES[extension]):
        return json_error("The file content does not match its type.", 400)
    upload.stream.seek(0)

    stored_name = f"{uuid.uuid4().hex}{extension}"  # random name: no guessing, no path tricks
    path = os.path.join(current_app.config["UPLOAD_FOLDER"], stored_name)
    upload.save(path)

    # Older resumes stay on disk because past applications may point to them.
    Resume.query.filter_by(user_id=g.current_user.id, is_active=True).update({"is_active": False})
    resume = Resume(user_id=g.current_user.id, file_name=original, stored_name=stored_name,
                    file_size_kb=max(1, os.path.getsize(path) // 1024))
    db.session.add(resume)
    db.session.commit()
    return jsonify(resume.to_dict()), 201


@bp.delete("/users/resume")
@roles_required("candidate")
def remove_resume():
    resume = _active_resume(g.current_user.id)
    if resume is None:
        return json_error("You have no resume to remove.", 404)
    resume.is_active = False
    db.session.commit()
    return "", 204


@bp.get("/resumes/<int:resume_id>/download")
@login_required
def download_resume(resume_id):
    """The candidate, an admin, or a recruiter who received an application with this resume."""
    resume = db.session.get(Resume, resume_id)
    if resume is None:
        return json_error("Resume not found.", 404)
    user = g.current_user
    allowed = resume.user_id == user.id or user.role == "admin"
    if not allowed and user.role == "recruiter":
        allowed = (db.session.query(Application.id)
                   .join(Job, Application.job_id == Job.id).join(Company, Job.company_id == Company.id)
                   .filter(Application.resume_id == resume.id, Company.recruiter_id == user.id).first() is not None)
    if not allowed:
        return json_error("You do not have access to this resume.", 403)
    return send_from_directory(current_app.config["UPLOAD_FOLDER"], resume.stored_name,
                               as_attachment=True, download_name=resume.file_name)


# ---------------------------------------------------------------- saved jobs
@bp.get("/saved-jobs")
@roles_required("candidate")
def list_saved():
    rows = SavedJob.query.filter_by(user_id=g.current_user.id).order_by(SavedJob.id.desc()).all()
    return jsonify([row.job.to_dict() for row in rows if not row.job.is_deleted])


@bp.post("/saved-jobs")
@roles_required("candidate")
def save_job():
    c = Check(request.get_json(silent=True))
    job_id = c.integer("jobId", "Job", 1)
    c.done()
    job = Job.query.filter_by(id=job_id, is_deleted=False).first()
    if job is None:
        return json_error("Job not found.", 404)
    if not SavedJob.query.filter_by(user_id=g.current_user.id, job_id=job.id).first():
        db.session.add(SavedJob(user_id=g.current_user.id, job_id=job.id))
        db.session.commit()
    return jsonify(job.to_dict()), 201


@bp.delete("/saved-jobs/<int:job_id>")
@roles_required("candidate")
def unsave_job(job_id):
    SavedJob.query.filter_by(user_id=g.current_user.id, job_id=job_id).delete()
    db.session.commit()
    return "", 204
