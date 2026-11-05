"""Allowed values shared by validation, queries and the database enums.
They match the options in the Angular app (core/models/job-options.ts)."""

SIGNUP_ROLES = ("candidate", "recruiter")  # admins are created with seed.py only
ROLES = ("candidate", "recruiter", "admin")

JOB_TYPES = ("Full Time", "Part Time", "Internship", "Contract")
WORK_MODES = ("On-site", "Hybrid", "Remote")
EXPERIENCE_BANDS = ("Fresher", "1-3 years", "3-5 years", "5+ years")
JOB_STATUSES = ("Open", "Closed")

# Salary bands in LPA: [from, to). A job matches when its salary range overlaps the band.
SALARY_BANDS = {"0-3 LPA": (0, 3), "3-6 LPA": (3, 6), "6-10 LPA": (6, 10), "10+ LPA": (10, 10_000)}
SORT_OPTIONS = ("newest", "salary_asc", "salary_desc", "relevance")

APPLICATION_STATUSES = ("Applied", "Under Review", "Shortlisted", "Interview", "Selected", "Rejected")

# What a recruiter may move an application to. "Interview" is reached only by scheduling an interview.
NEXT_STATUS = {
    "Applied": ("Under Review", "Shortlisted", "Rejected"),
    "Under Review": ("Shortlisted", "Rejected"),
    "Shortlisted": ("Interview", "Rejected"),
    "Interview": ("Selected", "Rejected"),
    "Selected": (),
    "Rejected": (),
}

INTERVIEW_MODES = ("Online", "On-site")
INTERVIEW_STATUSES = ("Scheduled", "Completed", "Cancelled")
NOTIFICATION_TYPES = ("application", "interview", "system")
REPORT_STATUSES = ("Open", "Resolved", "Dismissed")
