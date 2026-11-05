import io

from .conftest import COMPANY, auth, job_payload, register


# ---------------------------------------------------------------- auth
def test_register_login_me(client):
    token = register(client, "candidate", "a@example.com")
    me = client.get("/api/auth/me", headers=auth(token))
    assert me.status_code == 200 and me.get_json()["role"] == "candidate"

    login = client.post("/api/auth/login", json={"email": "A@example.com", "password": "Password1"})
    assert login.status_code == 200 and "token" in login.get_json()
    assert "password" not in str(login.get_json()).lower().replace("password1", "")


def test_wrong_password_and_unknown_email_look_the_same(client):
    register(client, "candidate", "a@example.com")
    wrong = client.post("/api/auth/login", json={"email": "a@example.com", "password": "Nope12345"})
    unknown = client.post("/api/auth/login", json={"email": "who@example.com", "password": "Nope12345"})
    assert wrong.status_code == unknown.status_code == 401
    assert wrong.get_json() == unknown.get_json()


def test_duplicate_email_and_validation(client):
    register(client, "candidate", "a@example.com")
    again = client.post("/api/auth/register", json={"name": "X Y", "email": "a@example.com", "password": "Password1", "role": "candidate"})
    assert again.status_code == 409
    bad = client.post("/api/auth/register", json={"name": "X", "email": "nope", "password": "short", "role": "admin"})
    assert bad.status_code == 400
    assert set(bad.get_json()["errors"]) == {"name", "email", "password", "role"}  # nobody can self-register as admin


def test_protected_routes_need_a_token(client):
    assert client.get("/api/auth/me").status_code == 401
    assert client.get("/api/auth/me", headers=auth("garbage")).status_code == 401


# ---------------------------------------------------------------- roles
def test_candidate_cannot_use_recruiter_endpoints(client):
    token = register(client, "candidate")
    assert client.post("/api/jobs", json=job_payload(), headers=auth(token)).status_code == 403
    assert client.post("/api/companies", json=COMPANY, headers=auth(token)).status_code == 403


def test_recruiter_cannot_post_before_creating_company(client):
    token = register(client, "recruiter")
    assert client.post("/api/jobs", json=job_payload(), headers=auth(token)).status_code == 409


# ---------------------------------------------------------------- jobs
def test_job_crud_and_ownership(client, recruiter, posted_job):
    job_id = posted_job["id"]
    assert client.get(f"/api/jobs/{job_id}").status_code == 200

    updated = client.put(f"/api/jobs/{job_id}", json={"title": "Senior Angular Developer"}, headers=auth(recruiter))
    assert updated.status_code == 200 and updated.get_json()["title"] == "Senior Angular Developer"

    other = register(client, "recruiter", "other@example.com")
    client.post("/api/companies", json={**COMPANY, "name": "Other Co"}, headers=auth(other))
    assert client.put(f"/api/jobs/{job_id}", json={"title": "Hacked title"}, headers=auth(other)).status_code == 403
    assert client.delete(f"/api/jobs/{job_id}", headers=auth(other)).status_code == 403

    closed = client.put(f"/api/jobs/{job_id}", json={"status": "Closed"}, headers=auth(recruiter))
    assert closed.get_json()["status"] == "Closed"
    assert client.get("/api/jobs").get_json() == []  # closed jobs are not listed publicly

    assert client.delete(f"/api/jobs/{job_id}", headers=auth(recruiter)).status_code == 204
    assert client.get(f"/api/jobs/{job_id}").status_code == 404


def test_job_validation(client, recruiter):
    bad = client.post("/api/jobs", json=job_payload(title="", salaryMin=10, salaryMax=5, applicationDeadline="2001-01-01T00:00:00Z"), headers=auth(recruiter))
    assert bad.status_code == 400
    assert {"title", "salaryMax"} <= set(bad.get_json()["errors"]) or "applicationDeadline" in bad.get_json()["errors"]


def test_search_filter_sort_paginate(client, recruiter):
    for title, location, mode, lo, hi in [
        ("Angular Developer", "Pune", "Hybrid", 6, 10), ("Python Developer", "Mumbai", "Remote", 3, 6),
        ("Data Analyst", "Pune", "On-site", 12, 18), ("React Developer", "Remote", "Remote", 0, 3),
    ]:
        response = client.post("/api/jobs", json=job_payload(title=title, location=location, workMode=mode, salaryMin=lo, salaryMax=hi,
                                                             skills=[title.split()[0]]), headers=auth(recruiter))
        assert response.status_code == 201, response.get_json()

    def titles(query):
        response = client.get(f"/api/jobs?{query}")
        assert response.status_code == 200
        return [j["title"] for j in response.get_json()], int(response.headers["X-Total-Count"])

    assert titles("keyword=angular")[0] == ["Angular Developer"]
    assert titles("keyword=python developer")[0] == ["Python Developer"]
    assert titles("location=pune")[1] == 2
    assert sorted(titles("workMode=Remote")[0]) == ["Python Developer", "React Developer"]
    assert titles("salary=10%2B LPA")[0] == ["Data Analyst"]
    assert titles("salary=0-3 LPA&salary=3-6 LPA")[1] == 2
    assert titles("sort=salary_desc")[0][0] == "Data Analyst"
    assert titles("sort=salary_asc")[0][0] == "React Developer"
    names, total = titles("page=2&limit=3")
    assert total == 4 and len(names) == 1


# ---------------------------------------------------------------- applications
def test_apply_duplicate_and_status_flow(client, recruiter, posted_job):
    candidate = register(client, "candidate", "c@example.com", name="Cara Candidate")
    job_id = posted_job["id"]

    first = client.post("/api/applications", json={"jobId": job_id}, headers=auth(candidate))
    assert first.status_code == 201 and first.get_json()["status"] == "Applied"
    duplicate = client.post("/api/applications", json={"jobId": job_id}, headers=auth(candidate))
    assert duplicate.status_code == 409
    app_id = first.get_json()["id"]

    mine = client.get("/api/applications/my", headers=auth(candidate)).get_json()
    assert len(mine) == 1 and mine[0]["job"]["id"] == job_id

    applicants = client.get(f"/api/jobs/{job_id}/applications", headers=auth(recruiter)).get_json()
    assert applicants[0]["candidate"]["name"] == "Cara Candidate"
    assert client.get(f"/api/jobs/{job_id}/applications", headers=auth(candidate)).status_code == 403

    # Applied -> Selected is not allowed; Applied -> Shortlisted is.
    assert client.put(f"/api/applications/{app_id}/status", json={"status": "Selected"}, headers=auth(recruiter)).status_code == 409
    assert client.put(f"/api/applications/{app_id}/status", json={"status": "Shortlisted"}, headers=auth(recruiter)).status_code == 200
    assert client.put(f"/api/applications/{app_id}/status", json={"status": "Interview"}, headers=auth(recruiter)).status_code == 400
    assert client.put(f"/api/applications/{app_id}/status", json={"status": "Rejected"}, headers=auth(candidate)).status_code == 403

    notes = client.get("/api/notifications", headers=auth(candidate)).get_json()
    assert any("shortlisted" in n["message"] for n in notes)
    assert any("New application" in n["message"] for n in client.get("/api/notifications", headers=auth(recruiter)).get_json())


def test_cannot_apply_to_closed_job(client, recruiter, posted_job):
    client.put(f"/api/jobs/{posted_job['id']}", json={"status": "Closed"}, headers=auth(recruiter))
    candidate = register(client, "candidate")
    assert client.post("/api/applications", json={"jobId": posted_job["id"]}, headers=auth(candidate)).status_code == 400


def test_interview_flow(client, recruiter, posted_job):
    candidate = register(client, "candidate")
    app_id = client.post("/api/applications", json={"jobId": posted_job["id"]}, headers=auth(candidate)).get_json()["id"]
    body = {"scheduledAt": "2099-05-01T10:00:00Z", "mode": "Online"}
    assert client.post(f"/api/applications/{app_id}/interview", json=body, headers=auth(recruiter)).status_code == 409  # not shortlisted yet

    client.put(f"/api/applications/{app_id}/status", json={"status": "Shortlisted"}, headers=auth(recruiter))
    assert client.post(f"/api/applications/{app_id}/interview", json={**body, "mode": "On-site"}, headers=auth(recruiter)).status_code == 400  # needs an address
    created = client.post(f"/api/applications/{app_id}/interview", json=body, headers=auth(recruiter))
    assert created.status_code == 201

    assert client.get(f"/api/applications/{app_id}", headers=auth(candidate)).get_json()["status"] == "Interview"
    assert len(client.get("/api/interviews", headers=auth(candidate)).get_json()) == 1
    assert len(client.get("/api/interviews", headers=auth(recruiter)).get_json()) == 1
    done = client.put(f"/api/interviews/{created.get_json()['id']}/status", json={"status": "Completed"}, headers=auth(recruiter))
    assert done.get_json()["status"] == "Completed"


# ---------------------------------------------------------------- profile, resume, saved jobs
def test_profile_update(client):
    token = register(client, "candidate")
    response = client.put("/api/users/profile", headers=auth(token), json={
        "headline": "Angular Developer", "phone": "9820012345", "skills": ["Angular", "RxJS"],
        "education": [{"degree": "B.E. Computer", "institute": "PIT Pune", "year": 2023}],
    })
    assert response.status_code == 200
    profile = client.get("/api/users/profile", headers=auth(token)).get_json()["profile"]
    assert profile["headline"] == "Angular Developer" and [s["name"] for s in profile["skills"]] == ["Angular", "RxJS"]

    bad = client.put("/api/users/profile", headers=auth(token), json={"phone": "12345", "education": [{"degree": ""}]})
    assert bad.status_code == 400 and "phone" in bad.get_json()["errors"]


def test_resume_upload_rules(client, recruiter, posted_job):
    token = register(client, "candidate")

    def upload(content, name):
        return client.post("/api/users/resume", headers=auth(token), content_type="multipart/form-data",
                           data={"file": (io.BytesIO(content), name)})

    assert upload(b"%PDF-1.4 fake pdf body", "cv.pdf").status_code == 201
    assert upload(b"MZ not really a pdf", "cv.pdf").status_code == 400          # content does not match the extension
    assert upload(b"%PDF-1.4", "cv.exe").status_code == 400                      # type not allowed
    assert upload(b"%PDF-1.4" + b"0" * (3 * 1024 * 1024), "big.pdf").status_code == 413  # larger than 2 MB

    resume = client.get("/api/users/resume", headers=auth(token)).get_json()
    assert resume["fileName"] == "cv.pdf"
    application = client.post("/api/applications", json={"jobId": posted_job["id"]}, headers=auth(token)).get_json()
    assert client.get(f"/api/resumes/{resume['id']}/download", headers=auth(recruiter)).status_code == 200  # recruiter who got the application
    stranger = register(client, "recruiter", "stranger@example.com")
    assert client.get(f"/api/resumes/{resume['id']}/download", headers=auth(stranger)).status_code == 403
    assert application["id"]


def test_saved_jobs(client, posted_job):
    token = register(client, "candidate")
    job_id = posted_job["id"]
    assert client.post("/api/saved-jobs", json={"jobId": job_id}, headers=auth(token)).status_code == 201
    assert client.post("/api/saved-jobs", json={"jobId": job_id}, headers=auth(token)).status_code == 201  # saving twice is harmless
    assert len(client.get("/api/saved-jobs", headers=auth(token)).get_json()) == 1
    assert client.delete(f"/api/saved-jobs/{job_id}", headers=auth(token)).status_code == 204
    assert client.get("/api/saved-jobs", headers=auth(token)).get_json() == []


# ---------------------------------------------------------------- companies and meta
def test_companies_and_categories(client, recruiter, posted_job):
    listing = client.get("/api/companies").get_json()
    assert listing[0]["name"] == "Acme Tech" and listing[0]["openJobs"] == 1
    assert client.get("/api/companies/me", headers=auth(recruiter)).get_json()["name"] == "Acme Tech"
    assert client.post("/api/companies", json=COMPANY, headers=auth(recruiter)).status_code == 409
    renamed = client.put("/api/companies", json={"name": "Acme Technologies"}, headers=auth(recruiter))
    assert renamed.status_code == 200 and renamed.get_json()["name"] == "Acme Technologies"
    categories = client.get("/api/categories").get_json()
    assert categories[0]["jobCount"] == 1
    assert client.get("/api/health").get_json() == {"status": "ok"}


def test_received_applications_stats_and_company_filter(client, recruiter, posted_job):
    candidate = register(client, "candidate", "c@example.com")
    client.post("/api/applications", json={"jobId": posted_job["id"]}, headers=auth(candidate))

    received = client.get("/api/applications/received", headers=auth(recruiter)).get_json()
    assert len(received) == 1
    assert received[0]["candidate"]["email"] == "c@example.com" and received[0]["job"]["id"] == posted_job["id"]
    assert client.get("/api/applications/received", headers=auth(candidate)).status_code == 403

    stats = client.get("/api/stats").get_json()
    assert stats == {"openJobs": 1, "companies": 1, "cities": 1, "categories": 2}

    company_id = posted_job["company"]["id"]
    assert len(client.get(f"/api/jobs?company={company_id}").get_json()) == 1
    assert client.get("/api/jobs?company=9999").get_json() == []
