from .extensions import db
from .utils import iso, utcnow
from . import constants as k

# Many-to-many link tables
job_skills = db.Table(
    "job_skills",
    db.Column("job_id", db.Integer, db.ForeignKey("jobs.id", ondelete="CASCADE"), primary_key=True),
    db.Column("skill_id", db.Integer, db.ForeignKey("skills.id", ondelete="CASCADE"), primary_key=True),
)
profile_skills = db.Table(
    "profile_skills",
    db.Column("user_id", db.Integer, db.ForeignKey("profiles.user_id", ondelete="CASCADE"), primary_key=True),
    db.Column("skill_id", db.Integer, db.ForeignKey("skills.id", ondelete="CASCADE"), primary_key=True),
)


class Timestamps:
    created_at = db.Column(db.DateTime, default=utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=utcnow, onupdate=utcnow, nullable=False)


class User(Timestamps, db.Model):
    __tablename__ = "users"
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.Enum(*k.ROLES, name="user_role"), nullable=False)
    is_active = db.Column(db.Boolean, default=True, nullable=False)  # admins can deactivate an account
    profile = db.relationship("Profile", uselist=False, back_populates="user", cascade="all, delete-orphan")

    def to_dict(self):
        return {"id": self.id, "name": self.name, "email": self.email, "role": self.role, "createdAt": iso(self.created_at)}

    def applicant_info(self, resume=None):
        """What a recruiter sees about a candidate."""
        info = {"name": self.name, "email": self.email, "skills": [], "education": [], "experience": []}
        if self.profile:
            p = self.profile.to_dict()
            info.update({key: p[key] for key in ("phone", "location", "headline", "about", "skills", "education", "experience")})
        if resume:
            info.update({"resumeName": resume.file_name, "resumeId": resume.id})
        return info


class Skill(db.Model):
    __tablename__ = "skills"
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), unique=True, nullable=False)

    def to_dict(self):
        return {"id": self.id, "name": self.name}


class Profile(db.Model):
    """One profile per candidate. Education and experience are small lists, kept as JSON."""
    __tablename__ = "profiles"
    user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    headline = db.Column(db.String(80))
    phone = db.Column(db.String(15))
    location = db.Column(db.String(100))
    about = db.Column(db.Text)
    education = db.Column(db.JSON, default=list)
    experience = db.Column(db.JSON, default=list)
    updated_at = db.Column(db.DateTime, default=utcnow, onupdate=utcnow, nullable=False)
    user = db.relationship("User", back_populates="profile")
    skills = db.relationship("Skill", secondary=profile_skills, lazy="selectin")

    def to_dict(self):
        return {
            "userId": self.user_id, "headline": self.headline, "phone": self.phone, "location": self.location,
            "about": self.about, "skills": [s.to_dict() for s in self.skills],
            "education": self.education or [], "experience": self.experience or [],
        }


class Resume(db.Model):
    __tablename__ = "resumes"
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    file_name = db.Column(db.String(255), nullable=False)       # what the candidate called it
    stored_name = db.Column(db.String(100), nullable=False)     # random name on disk
    file_size_kb = db.Column(db.Integer, nullable=False)
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    uploaded_at = db.Column(db.DateTime, default=utcnow, nullable=False)

    def to_dict(self):
        return {"id": self.id, "userId": self.user_id, "fileName": self.file_name,
                "fileSizeKb": self.file_size_kb, "uploadedAt": iso(self.uploaded_at)}


class Company(Timestamps, db.Model):
    __tablename__ = "companies"
    id = db.Column(db.Integer, primary_key=True)
    recruiter_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    name = db.Column(db.String(80), nullable=False)
    industry = db.Column(db.String(100), nullable=False)
    location = db.Column(db.String(100), nullable=False)
    website = db.Column(db.String(255))
    description = db.Column(db.Text, nullable=False)
    logo_url = db.Column(db.String(255))
    is_deleted = db.Column(db.Boolean, default=False, nullable=False)

    def to_dict(self, open_jobs=None):
        data = {"id": self.id, "recruiterId": self.recruiter_id, "name": self.name, "logoUrl": self.logo_url,
                "description": self.description, "website": self.website, "location": self.location, "industry": self.industry}
        if open_jobs is not None:
            data["openJobs"] = open_jobs
        return data


class Category(db.Model):
    __tablename__ = "job_categories"
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(80), unique=True, nullable=False)
    icon = db.Column(db.String(40))

    def to_dict(self):
        return {"id": self.id, "name": self.name, "icon": self.icon}


class Job(Timestamps, db.Model):
    __tablename__ = "jobs"
    id = db.Column(db.Integer, primary_key=True)
    company_id = db.Column(db.Integer, db.ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True)
    category_id = db.Column(db.Integer, db.ForeignKey("job_categories.id"), nullable=False, index=True)
    title = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text, nullable=False)
    responsibilities = db.Column(db.JSON, default=list)
    requirements = db.Column(db.JSON, default=list)
    benefits = db.Column(db.JSON, default=list)
    location = db.Column(db.String(100), nullable=False, index=True)
    job_type = db.Column(db.Enum(*k.JOB_TYPES, name="job_type"), nullable=False)
    work_mode = db.Column(db.Enum(*k.WORK_MODES, name="work_mode"), nullable=False)
    experience = db.Column(db.Enum(*k.EXPERIENCE_BANDS, name="experience_band"), nullable=False)
    salary_min = db.Column(db.Integer, nullable=False)  # LPA
    salary_max = db.Column(db.Integer, nullable=False)  # LPA
    posted_date = db.Column(db.DateTime, default=utcnow, nullable=False, index=True)
    application_deadline = db.Column(db.DateTime, nullable=False)
    status = db.Column(db.Enum(*k.JOB_STATUSES, name="job_status"), default="Open", nullable=False, index=True)
    is_deleted = db.Column(db.Boolean, default=False, nullable=False)  # soft delete keeps old applications resolvable

    company = db.relationship("Company", backref="jobs")
    category = db.relationship("Category")
    skills = db.relationship("Skill", secondary=job_skills, lazy="selectin")

    def to_dict(self):
        return {
            "id": self.id, "title": self.title, "company": self.company.to_dict(), "location": self.location,
            "jobType": self.job_type, "workMode": self.work_mode, "experience": self.experience,
            "salaryMin": self.salary_min, "salaryMax": self.salary_max, "description": self.description,
            "responsibilities": self.responsibilities or [], "requirements": self.requirements or [],
            "benefits": self.benefits or [], "skills": [s.to_dict() for s in self.skills],
            "category": self.category.to_dict(), "postedDate": iso(self.posted_date),
            "applicationDeadline": iso(self.application_deadline), "status": self.status,
        }


class Application(db.Model):
    __tablename__ = "applications"
    __table_args__ = (db.UniqueConstraint("candidate_id", "job_id", name="uq_application_candidate_job"),)
    id = db.Column(db.Integer, primary_key=True)
    job_id = db.Column(db.Integer, db.ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False, index=True)
    candidate_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    resume_id = db.Column(db.Integer, db.ForeignKey("resumes.id", ondelete="SET NULL"))
    status = db.Column(db.Enum(*k.APPLICATION_STATUSES, name="application_status"), default="Applied", nullable=False)
    applied_at = db.Column(db.DateTime, default=utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=utcnow, onupdate=utcnow, nullable=False)

    job = db.relationship("Job")
    candidate = db.relationship("User")
    resume = db.relationship("Resume")
    history = db.relationship("ApplicationHistory", order_by="ApplicationHistory.id", cascade="all, delete-orphan", backref="application")

    def to_dict(self, with_job=False, with_candidate=False):
        data = {
            "id": self.id, "jobId": self.job_id, "candidateId": self.candidate_id, "status": self.status,
            "appliedAt": iso(self.applied_at), "updatedAt": iso(self.updated_at),
            "history": [{"status": h.status, "at": iso(h.changed_at)} for h in self.history],
        }
        if with_job:
            data["job"] = self.job.to_dict()
        if with_candidate:
            data["candidate"] = self.candidate.applicant_info(self.resume)
        return data


class ApplicationHistory(db.Model):
    """One row per status change; the candidate's timeline is built from these."""
    __tablename__ = "application_history"
    id = db.Column(db.Integer, primary_key=True)
    application_id = db.Column(db.Integer, db.ForeignKey("applications.id", ondelete="CASCADE"), nullable=False, index=True)
    status = db.Column(db.Enum(*k.APPLICATION_STATUSES, name="history_status"), nullable=False)
    changed_at = db.Column(db.DateTime, default=utcnow, nullable=False)


class Interview(db.Model):
    __tablename__ = "interviews"
    id = db.Column(db.Integer, primary_key=True)
    application_id = db.Column(db.Integer, db.ForeignKey("applications.id", ondelete="CASCADE"), nullable=False, index=True)
    scheduled_at = db.Column(db.DateTime, nullable=False)
    mode = db.Column(db.Enum(*k.INTERVIEW_MODES, name="interview_mode"), nullable=False)
    location = db.Column(db.String(255))
    status = db.Column(db.Enum(*k.INTERVIEW_STATUSES, name="interview_status"), default="Scheduled", nullable=False)
    created_at = db.Column(db.DateTime, default=utcnow, nullable=False)
    application = db.relationship("Application")

    def to_dict(self):
        return {
            "id": self.id, "applicationId": self.application_id, "scheduledAt": iso(self.scheduled_at),
            "mode": self.mode, "location": self.location, "status": self.status,
            "job": self.application.job.to_dict(), "candidateName": self.application.candidate.name,
        }


class Notification(db.Model):
    __tablename__ = "notifications"
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    type = db.Column(db.Enum(*k.NOTIFICATION_TYPES, name="notification_type"), nullable=False)
    message = db.Column(db.String(255), nullable=False)
    is_read = db.Column(db.Boolean, default=False, nullable=False)
    created_at = db.Column(db.DateTime, default=utcnow, nullable=False)

    def to_dict(self):
        return {"id": self.id, "userId": self.user_id, "type": self.type, "message": self.message,
                "isRead": self.is_read, "createdAt": iso(self.created_at)}


class SavedJob(db.Model):
    __tablename__ = "saved_jobs"
    __table_args__ = (db.UniqueConstraint("user_id", "job_id", name="uq_saved_user_job"),)
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    job_id = db.Column(db.Integer, db.ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False)
    created_at = db.Column(db.DateTime, default=utcnow, nullable=False)
    job = db.relationship("Job")


class Report(db.Model):
    """A candidate reporting a job. Endpoints for this arrive with the admin moderation screens (Phase 8)."""
    __tablename__ = "reports"
    id = db.Column(db.Integer, primary_key=True)
    job_id = db.Column(db.Integer, db.ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False, index=True)
    reporter_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    reason = db.Column(db.String(255), nullable=False)
    status = db.Column(db.Enum(*k.REPORT_STATUSES, name="report_status"), default="Open", nullable=False)
    created_at = db.Column(db.DateTime, default=utcnow, nullable=False)
