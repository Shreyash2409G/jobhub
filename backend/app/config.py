import os
import tempfile
from datetime import timedelta

from dotenv import load_dotenv

load_dotenv()

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def normalize_database_url(url: str) -> str:
    """Hosting sites give "mysql://user:pass@host:port/db". SQLAlchemy needs the driver name: "mysql+pymysql://"."""
    return "mysql+pymysql://" + url[len("mysql://"):] if url.startswith("mysql://") else url


def problems_with_secrets(secret_key: str, jwt_secret_key: str) -> list:
    """What is wrong with the two secrets (empty list = fine). Used to stop a production start with weak keys."""
    problems = []
    for name, value in (("SECRET_KEY", secret_key), ("JWT_SECRET_KEY", jwt_secret_key)):
        if len(value) < 32 or any(weak in value for weak in ("change-me", "dev-secret", "dev-jwt")):
            problems.append(f"{name} must be a random string of at least 32 characters.")
    return problems


class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-change-me")
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "dev-jwt-secret-change-me")
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=int(os.getenv("JWT_EXPIRES_HOURS", "8")))

    SQLALCHEMY_DATABASE_URI = normalize_database_url(os.getenv("DATABASE_URL", "sqlite:///jobhub.db"))
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {"pool_pre_ping": True}

    # APP_ENV=production (on Render, Railway ...) switches the local-port shortcuts off.
    APP_ENV = os.getenv("APP_ENV", "development")
    CORS_ORIGINS = [o.strip() for o in os.getenv("CORS_ORIGINS", "http://localhost:4200").split(",") if o.strip()]
    if APP_ENV == "development":
        CORS_ORIGINS += [r"http://localhost:\d+", r"http://127\.0\.0\.1:\d+"]  # regular expressions

    UPLOAD_FOLDER = os.path.join(BASE_DIR, os.getenv("UPLOAD_FOLDER", "uploads"))
    MAX_CONTENT_LENGTH = 2 * 1024 * 1024  # resumes: 2 MB

    RATELIMIT_STORAGE_URI = os.getenv("RATELIMIT_STORAGE_URI", "memory://")
    RATELIMIT_ENABLED = True


class TestConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"
    SQLALCHEMY_ENGINE_OPTIONS = {}
    RATELIMIT_ENABLED = False
    UPLOAD_FOLDER = tempfile.mkdtemp(prefix="jobhub-test-uploads-")
