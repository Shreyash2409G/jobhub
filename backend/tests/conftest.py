import pytest

from app import create_app
from app.config import TestConfig
from app.extensions import db
from werkzeug.security import generate_password_hash

from app.models import Category, User


@pytest.fixture
def client():
    app = create_app(TestConfig)
    with app.app_context():
        db.create_all()
        db.session.add_all([Category(name="Frontend Development", icon="web"), Category(name="Data & Analytics", icon="insights")])
        db.session.commit()
        yield app.test_client()
        db.session.remove()
        db.drop_all()


def register(client, role="candidate", email=None, name="Test User", password="Password1"):
    email = email or f"{role}@example.com"
    response = client.post("/api/auth/register", json={"name": name, "email": email, "password": password, "role": role})
    assert response.status_code == 201, response.get_json()
    return response.get_json()["token"]


def auth(token):
    return {"Authorization": f"Bearer {token}"}


COMPANY = {"name": "Acme Tech", "industry": "Software", "location": "Pune",
           "description": "Acme Tech builds small business software used across India.", "website": "https://acme.example.com"}


def job_payload(**overrides):
    payload = {
        "title": "Angular Developer", "description": "Build and maintain Angular applications for our customers.",
        "responsibilities": ["Build UI", "Write tests"], "requirements": ["2 years of Angular"], "benefits": ["Health insurance"],
        "skills": ["Angular", "TypeScript"], "location": "Pune", "jobType": "Full Time", "experience": "1-3 years",
        "workMode": "Hybrid", "salaryMin": 6, "salaryMax": 10, "categoryId": 1,
        "applicationDeadline": "2099-01-01T00:00:00Z",
    }
    payload.update(overrides)
    return payload


@pytest.fixture
def recruiter(client):
    token = register(client, "recruiter", "hr@acme.example.com")
    assert client.post("/api/companies", json=COMPANY, headers=auth(token)).status_code == 201
    return token


@pytest.fixture
def posted_job(client, recruiter):
    response = client.post("/api/jobs", json=job_payload(), headers=auth(recruiter))
    assert response.status_code == 201, response.get_json()
    return response.get_json()


@pytest.fixture
def admin(client):
    """Admins are created in the database, never through /api/auth/register."""
    db.session.add(User(name="Site Admin", email="admin@example.com", role="admin", password_hash=generate_password_hash("Password1")))
    db.session.commit()
    return client.post("/api/auth/login", json={"email": "admin@example.com", "password": "Password1"}).get_json()["token"]
