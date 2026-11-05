# JobHub backend (Flask + MySQL)

REST API for the JobHub Angular app. Python, Flask, SQLAlchemy, MySQL, JWT.

## Folder map

```
backend/
├── run.py                 starts the server (python run.py)
├── seed.py                creates tables and fills demo data
├── schema.sql             reference copy of the MySQL tables
├── requirements.txt
├── .env.example           copy to .env
├── postman/               Postman collection (43 requests)
├── tests/                 pytest suite (uses an in-memory SQLite database)
└── app/
    ├── __init__.py        create_app(): wires everything, JSON error handlers
    ├── config.py          settings read from .env
    ├── constants.py       allowed values (job types, statuses, status flow ...)
    ├── extensions.py      db, jwt, cors, rate limiter
    ├── models.py          one class per table, each with to_dict()
    ├── auth_utils.py      token creation, @roles_required, ownership helpers
    ├── services.py        notify(), change_status(), get_or_create_skills()
    ├── utils.py           Check (input validation), error helpers
    └── routes/            auth, jobs, companies, applications, interviews, notifications, users, meta
```

## Run it (Windows)

Needs Python 3.10+ and, for MySQL, a running MySQL 8 server.

```cmd
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
```

**1. Choose a database** in `.env`:

- MySQL (target setup): create the database once, then put your password in `DATABASE_URL`.
  ```sql
  CREATE DATABASE jobhub CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
  ```
- No MySQL yet? Set `DATABASE_URL=sqlite:///jobhub.db` to try everything with a local file.

**2. Create tables and demo data, then start the server:**

```cmd
python seed.py --reset
python run.py
```

Open http://localhost:5000/api/health. You should see `{"status":"ok"}`.

Demo logins, password `Password@123` for all: `candidate@jobhub.demo`, `recruiter@jobhub.demo`, `admin@jobhub.demo`.

**3. Try the API in Postman:** import `postman/JobHub.postman_collection.json`, run one of the *Login* requests (it stores the JWT), then run any other request.

**4. Run the tests:**

```cmd
pytest
```

## How requests are protected

- `POST /api/auth/login` returns a JWT. Send it as `Authorization: Bearer <token>`.
- The token holds only the user id and role. Each protected route checks the role (`@roles_required`) and then checks ownership (a recruiter can only touch their own company's jobs and applicants).
- Passwords are hashed with Werkzeug (`generate_password_hash`) and never returned by the API.
- Login is limited to 10 attempts per minute per IP. Unknown emails and wrong passwords return the same answer.
- Admins cannot be created through the API, only with `seed.py`.
- An admin can deactivate an account: it cannot log in, and its old token stops working on the next request.
- Resume uploads are checked on the server: extension, file signature, 2 MB limit. Files are stored under random names outside the public URL space and only served after a permission check.
- Every error is JSON: `{"message": "...", "errors": {"field": "..."}}`.
- CORS only allows the origins in `CORS_ORIGINS`. While `APP_ENV=development` any `http://localhost:PORT` is also allowed; set `APP_ENV=production` when you deploy.

## Endpoints

Rows marked **+** are additions the Angular app needs, beyond the project plan's list.

| Method | Path | Who | Purpose |
|---|---|---|---|
| POST | `/api/auth/register` | public | Create a candidate or recruiter account |
| POST | `/api/auth/login` | public | Get a JWT |
| GET | `/api/auth/me` | any user | Current user and role |
| GET | `/api/jobs` | public | Search, filter, sort, paginate. Total in `X-Total-Count` header |
| GET | `/api/jobs/:id` | public | Job details |
| GET | `/api/jobs/:id/similar` | public | Jobs with overlapping skills **+** |
| GET | `/api/jobs/mine` | recruiter | Own jobs, open and closed, with applicant counts **+** |
| POST | `/api/jobs` | recruiter | Post a job |
| PUT | `/api/jobs/:id` | recruiter, admin | Edit. `{"status":"Closed"}` closes it, `{"status":"Open"}` reopens it |
| DELETE | `/api/jobs/:id` | recruiter, admin | Remove (soft delete) |
| POST | `/api/applications` | candidate | Apply. Body `{"jobId": 1}`. A second application returns 409 |
| GET | `/api/applications/my` | candidate | My applications |
| GET | `/api/applications/:id` | candidate, recruiter | One application with its timeline **+** |
| GET | `/api/applications/received` | recruiter | All applications to the recruiter's company **+** |
| GET | `/api/jobs/:id/applications` | recruiter, admin | Applicants of a job |
| PUT | `/api/applications/:id/status` | recruiter, admin | Move through the pipeline |
| POST | `/api/applications/:id/interview` | recruiter | Schedule an interview (sets status to Interview) **+** |
| GET | `/api/interviews` | candidate, recruiter | My interviews **+** |
| PUT | `/api/interviews/:id/status` | recruiter | Mark Completed or Cancelled **+** |
| GET | `/api/notifications` | any user | My notifications **+** |
| PUT | `/api/notifications/:id/read`, `/read-all` | any user | Mark as read **+** |
| GET, PUT | `/api/users/profile` | any user | Read or update profile (candidates: full profile) |
| GET, POST, DELETE | `/api/users/resume` | candidate | Resume info, upload (`multipart`, field `file`), remove **+** |
| GET | `/api/resumes/:id/download` | owner, recruiter with that application, admin | Download a resume **+** |
| GET, POST, DELETE | `/api/saved-jobs`, `/api/saved-jobs/:jobId` | candidate | Saved jobs **+** |
| GET | `/api/companies` | public | List (`?q=` searches name and industry) |
| GET | `/api/companies/:id` | public | Company details |
| GET | `/api/companies/me` | recruiter | Own company **+** |
| POST, PUT | `/api/companies` | recruiter | Create or update own company |
| GET | `/api/categories`, `/api/skills`, `/api/stats`, `/api/health` | public | Lookups, home page numbers, health check **+** |
| POST | `/api/jobs/:id/report` | candidate | Report a job (once while a report is open) **+** |
| GET | `/api/admin/stats` | admin | Totals and chart data for the admin dashboard **+** |
| GET | `/api/admin/users`, `/admin/companies`, `/admin/jobs`, `/admin/reports` | admin | Paged lists. `?q=` search, plus `?role=` / `?status=`. Total in `X-Total-Count` **+** |
| PUT | `/api/admin/users/:id`, `/admin/companies/:id`, `/admin/jobs/:id` | admin | Deactivate a user, remove or restore a company or job, close or reopen a job **+** |
| POST, PUT, DELETE | `/api/admin/categories`, `/admin/categories/:id` | admin | Manage job categories (a category in use cannot be deleted) **+** |
| PUT | `/api/admin/reports/:id` | admin | Resolve or dismiss a report. `closeJob: true` also closes the job **+** |

### Job search query parameters

`GET /api/jobs?keyword=angular&location=Pune&jobType=Full Time&experience=1-3 years&salary=6-10 LPA&workMode=Hybrid&category=1&sort=newest&page=1&limit=6`

- `keyword`: every word must match the title, the company or a skill.
- `jobType`, `experience`, `salary`, `workMode`: repeat the parameter or separate values with commas. Values inside one filter are OR, different filters are AND.
- `salary`: `0-3 LPA`, `3-6 LPA`, `6-10 LPA`, `10+ LPA`. A job matches when its salary range overlaps the band.
- `category` and `company` take an id.
- `sort`: `newest` (default), `salary_asc`, `salary_desc`, `relevance`.
- `page` starts at 1, `limit` is 1 to 50 (default 10).

### Application status flow

```
Applied -> Under Review -> Shortlisted -> Interview -> Selected
   \             \              \             \
    +-------------+--------------+-------------+--> Rejected
```
`PUT /status` allows Under Review, Shortlisted, Selected and Rejected (only the steps in the diagram). `Interview` is set by scheduling an interview. Each change writes a row to `application_history` and notifies the other side.

## Database

15 tables, see `schema.sql`.

| Relationship | Tables |
|---|---|
| users 1:1 profiles | `users`, `profiles` (candidates) |
| users 1:N resumes, saved_jobs, applications, notifications | `resumes`, `saved_jobs`, `applications`, `notifications` |
| recruiter 1:1 company, company 1:N jobs | `companies`, `jobs` |
| jobs N:N skills | `job_skills` (profiles use `profile_skills`) |
| jobs 1:N applications | `applications` with `UNIQUE(candidate_id, job_id)` |
| applications 1:N | `application_history`, `interviews` |
| moderation | `reports` (candidates report a job, admins review it) |

Design choices worth explaining in an interview: salary is `salary_min` / `salary_max` in LPA; jobs and companies are soft-deleted (`is_deleted`) so old applications still resolve; education and experience are small JSON lists on the profile instead of extra tables; the status timeline is its own table.

## Deploying (Phase 9)

Full steps are in `DEPLOYMENT.md` at the top of the repository. In short:

- `Procfile` and `render.yaml` run `gunicorn run:app`.
- Set `APP_ENV=production`, `DATABASE_URL`, `SECRET_KEY`, `JWT_SECRET_KEY` and `CORS_ORIGINS` (your Vercel or Netlify address).
  With `APP_ENV=production` the server refuses to start if a secret is shorter than 32 characters or still says "change-me",
  and `seed.py` refuses to run (it makes demo accounts with a public password).
- `python create_admin.py` creates any missing tables and an admin account. Run it once against the live database.
- A hosted MySQL address like `mysql://user:pass@host:port/db` works as it is.
- Uploaded resumes need a persistent disk or object storage on a real deployment.
