from app.config import normalize_database_url, problems_with_secrets


def test_hosted_mysql_url_gets_the_driver_name():
    assert normalize_database_url("mysql://u:p@host:3306/db") == "mysql+pymysql://u:p@host:3306/db"
    assert normalize_database_url("mysql+pymysql://u:p@host/db") == "mysql+pymysql://u:p@host/db"
    assert normalize_database_url("sqlite:///jobhub.db") == "sqlite:///jobhub.db"


def test_weak_secrets_are_reported():
    assert problems_with_secrets("x" * 40, "y" * 40) == []
    assert len(problems_with_secrets("short", "y" * 40)) == 1
    assert len(problems_with_secrets("change-me" + "x" * 40, "dev-jwt-secret-change-me-too-and-longer-than-32")) == 2
