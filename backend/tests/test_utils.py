"""Pure validation and rule tests (no database needed)."""
import pytest

from app import constants as k
from app.utils import Check, ValidationError, iso, parse_datetime


def test_signup_validation_collects_every_error():
    c = Check({"name": "A", "email": "nope", "password": "short", "role": "admin"})
    c.text("name", "Name", 2, 100)
    c.email()
    c.password()
    c.choice("role", k.SIGNUP_ROLES, "Role")
    assert set(c.errors) == {"name", "email", "password", "role"}
    with pytest.raises(ValidationError):
        c.done()


def test_valid_input_is_cleaned():
    c = Check({"name": " Asha Rao ", "email": " Asha@Example.COM ", "password": "Password1"})
    assert c.text("name", "Name", 2, 100) == "Asha Rao"
    assert c.email() == "asha@example.com"
    assert c.password() == "Password1"
    assert not c.errors


@pytest.mark.parametrize("password", ["12345678", "abcdefgh", "Pass1"])
def test_weak_passwords_are_rejected(password):
    c = Check({"password": password})
    c.password()
    assert "password" in c.errors


def test_integers_and_lists():
    c = Check({"a": 5, "b": 5.5, "c": True, "l": [" x ", ""], "bad": [1]})
    assert c.integer("a", "A", 0, 10) == 5
    c.integer("b", "B")
    c.integer("c", "C")
    assert c.text_list("l", "L", 1) == ["x"]
    c.text_list("bad", "Bad")
    assert set(c.errors) == {"b", "c", "bad"}


def test_dates_are_converted_to_naive_utc():
    assert parse_datetime("2030-01-01T10:00:00+05:30").hour == 4
    assert parse_datetime("nonsense") is None
    assert iso(parse_datetime("2030-01-01T10:00:00Z")) == "2030-01-01T10:00:00Z"


def test_status_flow_never_skips_the_interview_step_by_accident():
    assert k.NEXT_STATUS["Selected"] == () and k.NEXT_STATUS["Rejected"] == ()
    assert "Selected" not in k.NEXT_STATUS["Applied"]
    assert k.NEXT_STATUS["Shortlisted"][0] == "Interview"


def test_salary_band_overlap_rule():
    def bands(lo, hi):
        return [b for b, (a, z) in k.SALARY_BANDS.items() if hi > a and lo < z]
    assert bands(6, 10) == ["6-10 LPA"]
    assert bands(0, 3) == ["0-3 LPA"]
    assert bands(8, 13) == ["6-10 LPA", "10+ LPA"]
