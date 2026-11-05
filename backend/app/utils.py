"""Small helpers with no database code, so they are easy to test."""
import re
from datetime import datetime, timezone

from flask import jsonify

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
PASSWORD_RE = re.compile(r"^(?=.*[A-Za-z])(?=.*\d).{8,}$")


def utcnow() -> datetime:
    """Naive UTC time (MySQL DATETIME has no timezone)."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


def iso(value):
    return value.isoformat(timespec="seconds") + "Z" if value else None


def parse_datetime(value):
    """ISO string -> naive UTC datetime, or None when it is not a valid date."""
    if not isinstance(value, str):
        return None
    try:
        parsed = datetime.fromisoformat(value.strip().replace("Z", "+00:00"))
    except ValueError:
        return None
    if parsed.tzinfo:
        parsed = parsed.astimezone(timezone.utc).replace(tzinfo=None)
    return parsed


def json_error(message, status=400, errors=None):
    body = {"message": message}
    if errors:
        body["errors"] = errors
    return jsonify(body), status


class ValidationError(Exception):
    def __init__(self, errors):
        super().__init__("Validation failed")
        self.errors = errors


class Check:
    """Collects field errors, then done() raises one ValidationError.

        c = Check(data)
        name = c.text("name", "Name", 2, 100)
        c.done()
    """

    def __init__(self, data):
        self.data = data if isinstance(data, dict) else {}
        self.errors = {}

    def fail(self, key, message):
        self.errors.setdefault(key, message)

    def _value(self, key):
        value = self.data.get(key)
        if value is None or (isinstance(value, str) and not value.strip()):
            return None
        return value

    def text(self, key, label, min_len=1, max_len=255, required=True):
        value = self._value(key)
        if value is None:
            if required:
                self.fail(key, f"{label} is required.")
            return None
        if not isinstance(value, str):
            self.fail(key, f"{label} must be text.")
            return None
        value = value.strip()
        if len(value) < min_len:
            self.fail(key, f"{label} must be at least {min_len} characters.")
        elif len(value) > max_len:
            self.fail(key, f"{label} must be at most {max_len} characters.")
        return value

    def email(self, key="email"):
        value = self.text(key, "Email", 3, 255)
        if value is not None and not EMAIL_RE.match(value):
            self.fail(key, "Enter a valid email address.")
        return value.lower() if value else None

    def password(self, key="password"):
        value = self.data.get(key)
        if not isinstance(value, str) or not value:
            self.fail(key, "Password is required.")
            return None
        if len(value) > 128 or not PASSWORD_RE.match(value):
            self.fail(key, "Use 8+ characters with a letter and a number.")
        return value

    def choice(self, key, options, label, required=True):
        value = self._value(key)
        if value is None:
            if required:
                self.fail(key, f"{label} is required.")
            return None
        if value not in options:
            self.fail(key, f"{label} must be one of: {', '.join(options)}.")
            return None
        return value

    def integer(self, key, label, minimum=None, maximum=None, required=True):
        value = self._value(key)
        if value is None:
            if required:
                self.fail(key, f"{label} is required.")
            return None
        if isinstance(value, bool) or not isinstance(value, (int, float)) or int(value) != value:
            self.fail(key, f"{label} must be a whole number.")
            return None
        value = int(value)
        if minimum is not None and value < minimum:
            self.fail(key, f"{label} must be at least {minimum}.")
        if maximum is not None and value > maximum:
            self.fail(key, f"{label} must be at most {maximum}.")
        return value

    def moment(self, key, label, required=True):
        value = self._value(key)
        if value is None:
            if required:
                self.fail(key, f"{label} is required.")
            return None
        parsed = parse_datetime(value)
        if parsed is None:
            self.fail(key, f"{label} must be a valid date.")
        return parsed

    def text_list(self, key, label, min_items=0, max_items=50, max_len=300):
        value = self.data.get(key)
        if value is None:
            value = []
        if not isinstance(value, list) or not all(isinstance(v, str) for v in value):
            self.fail(key, f"{label} must be a list of text values.")
            return []
        items = [v.strip() for v in value if v.strip()]
        if len(items) < min_items:
            self.fail(key, f"Add at least {min_items} item(s) to {label.lower()}.")
        if len(items) > max_items:
            self.fail(key, f"{label} can have at most {max_items} items.")
        if any(len(v) > max_len for v in items):
            self.fail(key, f"Each item in {label.lower()} must be at most {max_len} characters.")
        return items

    def done(self):
        if self.errors:
            raise ValidationError(self.errors)
