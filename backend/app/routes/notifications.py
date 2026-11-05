from flask import Blueprint, g, jsonify

from ..auth_utils import login_required
from ..extensions import db
from ..models import Notification
from ..utils import json_error

bp = Blueprint("notifications", __name__)


@bp.get("/notifications")
@login_required
def list_notifications():
    items = Notification.query.filter_by(user_id=g.current_user.id).order_by(Notification.created_at.desc(), Notification.id.desc()).all()
    return jsonify([n.to_dict() for n in items])


@bp.put("/notifications/read-all")
@login_required
def read_all():
    Notification.query.filter_by(user_id=g.current_user.id, is_read=False).update({"is_read": True})
    db.session.commit()
    return jsonify(ok=True)


@bp.put("/notifications/<int:notification_id>/read")
@login_required
def read_one(notification_id):
    notification = Notification.query.filter_by(id=notification_id, user_id=g.current_user.id).first()
    if notification is None:
        return json_error("Notification not found.", 404)
    notification.is_read = True
    db.session.commit()
    return jsonify(notification.to_dict())
