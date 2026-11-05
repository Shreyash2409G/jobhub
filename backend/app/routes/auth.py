from flask import Blueprint, g, jsonify, request
from werkzeug.security import check_password_hash, generate_password_hash

from ..auth_utils import login_required, make_token
from ..constants import SIGNUP_ROLES
from ..extensions import db, limiter
from ..models import Profile, User
from ..utils import Check, json_error

bp = Blueprint("auth", __name__)

# Hash of a throwaway password: checked when the email is unknown so response time does not reveal which emails exist.
_DUMMY_HASH = generate_password_hash("not-a-real-password-1")


@bp.post("/auth/register")
def register():
    c = Check(request.get_json(silent=True))
    name = c.text("name", "Name", 2, 100)
    email = c.email()
    password = c.password()
    role = c.choice("role", SIGNUP_ROLES, "Role")
    c.done()

    if User.query.filter_by(email=email).first():
        return json_error("An account with this email already exists.", 409)

    user = User(name=name, email=email, role=role, password_hash=generate_password_hash(password))
    if role == "candidate":
        user.profile = Profile()
    db.session.add(user)
    db.session.commit()
    return jsonify(token=make_token(user), user=user.to_dict()), 201


@bp.post("/auth/login")
@limiter.limit("10 per minute")  # slows down password guessing
def login():
    data = request.get_json(silent=True) or {}
    email = str(data.get("email", "")).strip().lower()
    password = str(data.get("password", ""))

    user = User.query.filter_by(email=email).first()
    if user is None:
        check_password_hash(_DUMMY_HASH, password)
        return json_error("Incorrect email or password.", 401)
    if not check_password_hash(user.password_hash, password):
        return json_error("Incorrect email or password.", 401)
    if not user.is_active:
        return json_error("This account has been deactivated. Please contact support.", 403)
    return jsonify(token=make_token(user), user=user.to_dict())


@bp.get("/auth/me")
@login_required
def me():
    return jsonify(g.current_user.to_dict())
