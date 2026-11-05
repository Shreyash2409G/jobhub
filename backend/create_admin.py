"""Create an admin account (or turn an existing account into one). Use this on a live site instead of seed.py.

    python create_admin.py

It asks for a name, an email and a password. Admins cannot be created through the API on purpose.
"""
import getpass
import sys

from werkzeug.security import generate_password_hash

from app import create_app
from app.extensions import db
from app.models import User
from app.utils import Check


def main() -> None:
    app = create_app()
    name = input("Admin name: ").strip()
    email = input("Admin email: ").strip()
    password = getpass.getpass("Password (8+ characters, with a letter and a number): ")
    if getpass.getpass("Repeat the password: ") != password:
        sys.exit("The two passwords are different. Nothing was saved.")

    check = Check({"name": name, "email": email, "password": password})
    name = check.text("name", "Name", 2, 100)
    email = check.email()
    check.password()
    if check.errors:
        sys.exit("Nothing was saved:\n  " + "\n  ".join(check.errors.values()))

    with app.app_context():
        db.create_all()  # creates only the tables that are missing
        user = User.query.filter_by(email=email).first()
        if user:
            user.role, user.is_active, user.password_hash = "admin", True, generate_password_hash(password)
            print(f"{email} already existed: it is now an admin with the new password.")
        else:
            db.session.add(User(name=name, email=email, role="admin", password_hash=generate_password_hash(password)))
            print(f"Admin {email} created.")
        db.session.commit()


if __name__ == "__main__":
    main()
