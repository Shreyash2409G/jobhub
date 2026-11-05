import os

from app import create_app

app = create_app()  # gunicorn run:app uses this

if __name__ == "__main__":
    # Debug mode (auto-reload and the in-browser debugger) is for your own computer only.
    app.run(debug=os.getenv("APP_ENV", "development") != "production", port=5000)
