from functools import wraps

from flask import g
from flask_jwt_extended import create_access_token, get_jwt_identity, verify_jwt_in_request

from .extensions import db
from .models import Company, User
from .utils import json_error


def make_token(user: User) -> str:
    # The token only carries the user id (as text) and role; everything else is read from the database.
    return create_access_token(identity=str(user.id), additional_claims={"role": user.role})


def roles_required(*roles):
    """Protect a route: valid JWT and one of the given roles. The user is available as g.current_user."""
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            verify_jwt_in_request()
            user = db.session.get(User, int(get_jwt_identity()))
            if user is None:
                return json_error("Your account no longer exists. Please login again.", 401)
            if not user.is_active:
                return json_error("This account has been deactivated.", 401)  # 401 logs the person out in Angular
            if user.role not in roles:
                return json_error("You do not have permission to do this.", 403)
            g.current_user = user
            return fn(*args, **kwargs)
        return wrapper
    return decorator


login_required = roles_required("candidate", "recruiter", "admin")


def recruiter_company(user: User):
    return Company.query.filter_by(recruiter_id=user.id, is_deleted=False).first()


def can_manage_job(user: User, job) -> bool:
    return user.role == "admin" or (user.role == "recruiter" and job.company.recruiter_id == user.id)
