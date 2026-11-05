from .conftest import auth, job_payload, register


def test_only_admins_can_use_admin_endpoints(client, admin):
    candidate = register(client, "candidate")
    assert client.get("/api/admin/stats", headers=auth(candidate)).status_code == 403
    assert client.get("/api/admin/users").status_code == 401
    assert client.get("/api/admin/stats", headers=auth(admin)).status_code == 200


def test_stats_and_charts(client, admin, recruiter, posted_job):
    candidate = register(client, "candidate", "c@example.com")
    client.post("/api/applications", json={"jobId": posted_job["id"]}, headers=auth(candidate))

    data = client.get("/api/admin/stats", headers=auth(admin)).get_json()
    assert data["totals"] == {"users": 3, "recruiters": 1, "companies": 1, "jobs": 1, "applications": 1, "openReports": 0}
    assert data["funnel"][0] == {"status": "Applied", "count": 1}
    assert [s["status"] for s in data["funnel"]] == ["Applied", "Under Review", "Shortlisted", "Interview", "Selected"]
    assert len(data["applicationsPerDay"]) == 14 and data["applicationsPerDay"][-1]["count"] == 1
    assert {c["name"]: c["count"] for c in data["jobsByCategory"]}["Frontend Development"] == 1
    assert {r["role"]: r["count"] for r in data["usersByRole"]} == {"candidate": 1, "recruiter": 1, "admin": 1}


def test_user_list_search_filter_and_deactivate(client, admin, recruiter):
    candidate = register(client, "candidate", "cara@example.com", name="Cara Candidate")
    users = client.get("/api/admin/users?limit=2", headers=auth(admin))
    assert len(users.get_json()) == 2 and users.headers["X-Total-Count"] == "3"
    found = client.get("/api/admin/users?q=cara", headers=auth(admin)).get_json()
    assert [u["email"] for u in found] == ["cara@example.com"]
    recruiters = client.get("/api/admin/users?role=recruiter", headers=auth(admin)).get_json()
    assert recruiters[0]["companyName"] == "Acme Tech" and recruiters[0]["jobCount"] == 0

    user_id = found[0]["id"]
    assert client.put(f"/api/admin/users/{user_id}", json={"isActive": False}, headers=auth(admin)).get_json()["isActive"] is False
    assert client.get("/api/auth/me", headers=auth(candidate)).status_code == 401  # old token stops working
    login = client.post("/api/auth/login", json={"email": "cara@example.com", "password": "Password1"})
    assert login.status_code == 403
    client.put(f"/api/admin/users/{user_id}", json={"isActive": True}, headers=auth(admin))
    assert client.post("/api/auth/login", json={"email": "cara@example.com", "password": "Password1"}).status_code == 200

    admin_id = client.get("/api/admin/users?role=admin", headers=auth(admin)).get_json()[0]["id"]
    assert client.put(f"/api/admin/users/{admin_id}", json={"isActive": False}, headers=auth(admin)).status_code == 409


def test_remove_and_restore_company_and_job(client, admin, recruiter, posted_job):
    company_id = posted_job["company"]["id"]
    job_id = posted_job["id"]

    closed = client.put(f"/api/admin/jobs/{job_id}", json={"status": "Closed"}, headers=auth(admin))
    assert closed.status_code == 200 and closed.get_json()["status"] == "Closed"
    assert client.get("/api/jobs").get_json() == []
    assert any("closed by an administrator" in n["message"] for n in client.get("/api/notifications", headers=auth(recruiter)).get_json())
    assert client.put(f"/api/admin/jobs/{job_id}", json={"status": "Open"}, headers=auth(admin)).status_code == 200
    assert len(client.get("/api/jobs").get_json()) == 1

    client.put(f"/api/admin/companies/{company_id}", json={"isDeleted": True}, headers=auth(admin))
    assert client.get("/api/jobs").get_json() == [] and client.get("/api/companies").get_json() == []
    assert len(client.get("/api/admin/companies?status=Removed", headers=auth(admin)).get_json()) == 1
    client.put(f"/api/admin/companies/{company_id}", json={"isDeleted": False}, headers=auth(admin))
    assert len(client.get("/api/jobs").get_json()) == 1

    client.put(f"/api/admin/jobs/{job_id}", json={"isDeleted": True}, headers=auth(admin))
    assert client.get(f"/api/jobs/{job_id}").status_code == 404
    assert len(client.get("/api/admin/jobs?status=Removed", headers=auth(admin)).get_json()) == 1
    client.put(f"/api/admin/jobs/{job_id}", json={"isDeleted": False}, headers=auth(admin))
    assert client.get(f"/api/jobs/{job_id}").status_code == 200
    assert client.put(f"/api/admin/jobs/{job_id}", json={}, headers=auth(admin)).status_code == 400


def test_category_management(client, admin, recruiter, posted_job):
    created = client.post("/api/admin/categories", json={"name": "Marketing", "icon": "campaign"}, headers=auth(admin))
    assert created.status_code == 201
    assert client.post("/api/admin/categories", json={"name": "marketing"}, headers=auth(admin)).status_code == 409  # same name, any case
    new_id = created.get_json()["id"]
    assert client.put(f"/api/admin/categories/{new_id}", json={"name": "Digital Marketing"}, headers=auth(admin)).get_json()["name"] == "Digital Marketing"
    assert client.delete(f"/api/admin/categories/{new_id}", headers=auth(admin)).status_code == 204
    in_use = client.delete(f"/api/admin/categories/{posted_job['category']['id']}", headers=auth(admin))
    assert in_use.status_code == 409 and "use this category" in in_use.get_json()["message"]


def test_report_flow(client, admin, recruiter, posted_job):
    job_id = posted_job["id"]
    candidate = register(client, "candidate", "c@example.com", name="Cara Candidate")
    assert client.post(f"/api/jobs/{job_id}/report", json={"reason": "no"}, headers=auth(candidate)).status_code == 400  # too short
    assert client.post(f"/api/jobs/{job_id}/report", json={"reason": "Asks for a registration fee"}).status_code == 401
    assert client.post(f"/api/jobs/{job_id}/report", json={"reason": "Asks for a registration fee"}, headers=auth(candidate)).status_code == 201
    assert client.post(f"/api/jobs/{job_id}/report", json={"reason": "Asks for a registration fee"}, headers=auth(candidate)).status_code == 409

    reports = client.get("/api/admin/reports?status=Open", headers=auth(admin)).get_json()
    assert len(reports) == 1 and reports[0]["reporterName"] == "Cara Candidate" and reports[0]["jobTitle"] == "Angular Developer"
    assert client.get("/api/admin/stats", headers=auth(admin)).get_json()["totals"]["openReports"] == 1

    done = client.put(f"/api/admin/reports/{reports[0]['id']}", json={"status": "Resolved", "closeJob": True}, headers=auth(admin))
    assert done.status_code == 200 and done.get_json()["status"] == "Resolved" and done.get_json()["jobStatus"] == "Closed"
    assert client.get(f"/api/jobs/{job_id}").get_json()["status"] == "Closed"
    assert client.put(f"/api/admin/reports/{reports[0]['id']}", json={"status": "Dismissed"}, headers=auth(admin)).status_code == 409
    assert client.get("/api/admin/reports?status=Open", headers=auth(admin)).get_json() == []
