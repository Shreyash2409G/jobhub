import logging
import os

from flask import Flask, jsonify, request
from werkzeug.exceptions import HTTPException

from .config import Config, problems_with_secrets
from .extensions import cors, db, jwt, limiter
from .utils import ValidationError, json_error


def create_app(config_object=None):
    app = Flask(__name__)
    app.config.from_object(config_object or Config)
    os.makedirs(app.config["UPLOAD_FOLDER"], exist_ok=True)

    if not app.config.get("TESTING"):
        problems = problems_with_secrets(app.config["SECRET_KEY"], app.config["JWT_SECRET_KEY"])
        if problems and app.config.get("APP_ENV") == "production":
            raise RuntimeError(
                "Unsafe settings for production: " + " ".join(problems)
                + ' Make one with: python -c "import secrets; print(secrets.token_hex(32))"'
            )
        if problems:
            logging.warning("Weak secret keys (fine on your computer). Set long random ones before deploying.")

    db.init_app(app)
    jwt.init_app(app)
    limiter.init_app(app)
    cors.init_app(
        app,
        resources={r"/api/*": {"origins": app.config["CORS_ORIGINS"]}},
        expose_headers=["X-Total-Count"],
    )

    from .routes import admin, applications, auth, companies, interviews, jobs, meta, notifications, users
    for module in (meta, auth, jobs, companies, applications, interviews, notifications, users, admin):
        app.register_blueprint(module.bp, url_prefix="/api")

    register_error_handlers(app)

    @app.after_request
    def security_headers(response):
        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        return response

    @app.cli.command("init-db")
    def init_db():
        """Create all tables from the models: flask --app run init-db"""
        db.create_all()
        print("Tables created.")

    return app


def register_error_handlers(app):
    # Every error is JSON in the same shape: {"message": "...", "errors": {...}}
    @jwt.unauthorized_loader
    def missing_token(_reason):
        return json_error("Please login to continue.", 401)

    @jwt.invalid_token_loader
    def invalid_token(_reason):
        return json_error("Your session is invalid. Please login again.", 401)

    @jwt.expired_token_loader
    def expired_token(_header, _payload):
        return json_error("Your session has expired. Please login again.", 401)

    @app.errorhandler(ValidationError)
    def validation_error(error):
        return json_error("Please fix the highlighted fields.", 400, error.errors)

    @app.errorhandler(HTTPException)
    def http_error(error):
        messages = {
            404: "We could not find what you were looking for.",
            405: "That method is not allowed here.",
            413: "The file is larger than 2 MB.",
            429: "Too many attempts. Please wait a minute and try again.",
        }
        return json_error(messages.get(error.code, error.description), error.code)

    @app.errorhandler(Exception)
    def unexpected_error(error):
        db.session.rollback()
        app.logger.exception("Unhandled error on %s %s", request.method, request.path)
        return json_error("Something went wrong on our side. Please try again.", 500)
