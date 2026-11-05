"""Fill the database with demo data that mirrors the Angular mock data.

    python seed.py            # only if the database is empty
    python seed.py --reset    # drop every table first (deletes all data!)

Demo logins (password for all of them: Password@123):
    candidate@jobhub.demo   recruiter@jobhub.demo   admin@jobhub.demo
"""
import sys
from datetime import timedelta

from werkzeug.security import generate_password_hash

from app import create_app
from app.extensions import db
from app.models import (Application, ApplicationHistory, Category, Company, Interview, Job, Notification,
                        Profile, Report, Skill, User)
from app.utils import utcnow

DEMO_PASSWORD = "Password@123"
PASSWORD_HASH = generate_password_hash(DEMO_PASSWORD)


def ago(days):
    return utcnow() - timedelta(days=days)


def at(days_from_now, hour):
    return (utcnow() + timedelta(days=days_from_now)).replace(hour=hour, minute=0, second=0, microsecond=0)


CATEGORIES = [("Frontend Development", "web"), ("Backend Development", "dns"), ("Full Stack", "layers"),
              ("Data & Analytics", "insights"), ("UI/UX Design", "brush"), ("Software Development", "terminal")]

SKILLS = ["Angular", "TypeScript", "RxJS", "JavaScript", "HTML/CSS", "React", "Python", "Flask", "MySQL", "SQL",
          "Power BI", "Excel", "Tableau", "Statistics", "Figma", "UX Research", "Node.js", "Git", "REST APIs",
          "Java", "Spring Boot", "Docker", "AWS"]

# name, industry, location, website, description  (company 1 belongs to the demo recruiter)
COMPANIES = [
    ("Nimbus Labs", "SaaS / Cloud Software", "Pune", "https://nimbuslabs.example.com",
     "Nimbus Labs builds workflow software for mid-sized manufacturers. A 160-person product team in Pune ships weekly and owns its features end to end."),
    ("Kaveri Analytics", "Data & Analytics", "Bangalore", "https://kaverianalytics.example.com",
     "Kaveri Analytics helps retail and logistics companies turn raw data into decisions through dashboards, forecasting models and data engineering."),
    ("PixelCraft Studio", "Design & Digital Agency", "Mumbai", "https://pixelcraft.example.com",
     "PixelCraft is a Mumbai design studio creating web and mobile products for consumer brands, from research and prototypes to front-end delivery."),
    ("Zenith FinServe", "Fintech", "Mumbai", "https://zenithfinserve.example.com",
     "Zenith FinServe provides digital lending and payments platforms to banks and NBFCs, with engineering teams in Mumbai and Navi Mumbai."),
    ("GreenLeaf Health", "Healthtech", "Hyderabad", "https://greenleafhealth.example.com",
     "GreenLeaf Health runs a patient-records and diagnostics platform used by 400+ clinics, and relies on analysts to track quality and operations."),
    ("Orbit Logistics", "Logistics & Supply Chain", "Navi Mumbai", "https://orbitlogistics.example.com",
     "Orbit Logistics operates a fleet-tracking and warehouse platform for e-commerce shippers across western and northern India."),
    ("BlueOrchid Retail", "E-commerce", "Delhi", "https://blueorchid.example.com",
     "BlueOrchid is a Delhi-based online marketplace for home and lifestyle products, growing its product, design and engineering teams."),
]

# title, company#, location, type, mode, experience, min, max, category#, skills, posted days ago, deadline in days
JOBS = [
    ("Angular Developer", 1, "Pune", "Full Time", "Hybrid", "1-3 years", 6, 10, 1, ["Angular", "TypeScript", "RxJS", "HTML/CSS"], 1, 20),
    ("Frontend Developer", 3, "Mumbai", "Full Time", "On-site", "1-3 years", 5, 9, 1, ["JavaScript", "React", "HTML/CSS", "Git"], 2, 25),
    ("Senior Angular Developer", 4, "Mumbai", "Full Time", "Hybrid", "5+ years", 18, 28, 1, ["Angular", "TypeScript", "RxJS", "REST APIs"], 3, 30),
    ("Python Developer", 1, "Pune", "Full Time", "Hybrid", "1-3 years", 6, 11, 2, ["Python", "Flask", "MySQL", "REST APIs"], 4, 18),
    ("Full Stack Developer", 2, "Bangalore", "Full Time", "Hybrid", "3-5 years", 14, 22, 3, ["Angular", "Python", "Flask", "MySQL"], 2, 22),
    ("Data Analyst", 2, "Bangalore", "Full Time", "On-site", "1-3 years", 5, 9, 4, ["SQL", "Excel", "Power BI", "Python"], 5, 15),
    ("UI/UX Designer", 3, "Mumbai", "Full Time", "Hybrid", "1-3 years", 6, 12, 5, ["Figma", "UX Research", "HTML/CSS"], 3, 28),
    ("Software Developer", 4, "Navi Mumbai", "Full Time", "On-site", "Fresher", 3, 5, 6, ["Java", "Spring Boot", "SQL", "Git"], 6, 14),
    ("Frontend Developer", 1, "Remote", "Full Time", "Remote", "3-5 years", 12, 18, 1, ["React", "TypeScript", "JavaScript", "Git"], 1, 26),
    ("Data Analyst Intern", 5, "Hyderabad", "Internship", "Hybrid", "Fresher", 0, 3, 4, ["Excel", "SQL", "Tableau"], 7, 10),
    ("Backend Developer", 6, "Navi Mumbai", "Full Time", "On-site", "3-5 years", 10, 16, 2, ["Python", "Docker", "MySQL", "AWS"], 8, 21),
    ("Full Stack Developer", 7, "Delhi", "Full Time", "Hybrid", "1-3 years", 7, 12, 3, ["Node.js", "React", "MySQL", "Git"], 4, 19),
    ("Business Intelligence Analyst", 5, "Hyderabad", "Full Time", "Hybrid", "3-5 years", 10, 15, 4, ["Power BI", "SQL", "Statistics", "Excel"], 9, 24),
    ("Angular Developer Intern", 1, "Pune", "Internship", "On-site", "Fresher", 0, 3, 1, ["Angular", "TypeScript", "HTML/CSS"], 2, 12),
    ("Product Designer", 7, "Delhi", "Full Time", "Hybrid", "3-5 years", 12, 20, 5, ["Figma", "UX Research", "HTML/CSS"], 10, 27),
    ("Java Developer", 6, "Hyderabad", "Contract", "On-site", "3-5 years", 9, 14, 6, ["Java", "Spring Boot", "Docker", "SQL"], 11, 16),
    ("Part-time Data Analyst", 4, "Mumbai", "Part Time", "Remote", "1-3 years", 3, 6, 4, ["Excel", "SQL", "Power BI"], 5, 17),
    ("Software Developer", 4, "Mumbai", "Full Time", "Hybrid", "1-3 years", 8, 13, 6, ["Java", "REST APIs", "Git"], 30, -5),  # closed
]

RESPONSIBILITIES = {
    1: ["Build responsive, accessible interfaces using {s}", "Turn Figma designs into reusable components",
        "Integrate REST APIs and handle loading and error states cleanly", "Review pull requests and keep the UI codebase tested and tidy"],
    2: ["Design, build and maintain REST APIs using {s}", "Write clean, tested server-side code",
        "Optimise database queries and API response times", "Monitor services and fix production issues"],
    3: ["Build features end to end, from database to user interface, using {s}", "Design REST endpoints and consume them from the front end",
        "Write unit and integration tests for the code you ship", "Take part in sprint planning and code reviews"],
    4: ["Clean, analyse and interpret business data using {s}", "Build dashboards and recurring reports for business teams",
        "Present findings and recommendations to non-technical stakeholders", "Check data quality and document how metrics are calculated"],
    5: ["Run user interviews and usability tests, and summarise what you learn", "Design flows, wireframes and prototypes in {s}",
        "Maintain the design system and hand off specs to engineers", "Work with product managers to prioritise design work"],
    6: ["Develop and maintain application modules using {s}", "Debug and fix defects reported by QA and customers",
        "Write unit tests and clear technical documentation", "Work with the team in agile sprints and daily stand-ups"],
}
BENEFITS = ["Health insurance for you and your family", "Paid leave and public holidays",
            "Annual learning budget for courses and certifications", "Performance bonus"]


def run():
    skills = {name: Skill(name=name) for name in SKILLS}
    db.session.add_all(skills.values())
    categories = {i + 1: Category(name=n, icon=icon) for i, (n, icon) in enumerate(CATEGORIES)}
    db.session.add_all(categories.values())

    def user(name, email, role):
        u = User(name=name, email=email, role=role, password_hash=PASSWORD_HASH)
        db.session.add(u)
        return u

    def candidate(name, email, headline, location, phone, skill_names, education, experience, about=None):
        u = user(name, email, "candidate")
        u.profile = Profile(headline=headline, location=location, phone=phone, about=about, education=education, experience=experience)
        u.profile.skills = [skills[n] for n in skill_names]
        return u

    user("Platform Admin", "admin@jobhub.demo", "admin")
    aarav = candidate(
        "Aarav Sharma", "candidate@jobhub.demo", "Angular Developer | TypeScript | RxJS", "Pune", "9820012345",
        ["Angular", "TypeScript", "RxJS", "HTML/CSS", "Git"],
        [{"degree": "B.E. Computer Engineering", "institute": "Pune Institute of Technology", "year": 2023}],
        [{"title": "Junior Frontend Developer", "company": "Brightwave Technologies", "from": "2023-07",
          "description": "Built dashboard modules in Angular and integrated REST APIs."}],
        "Frontend developer with 2 years of experience building Angular applications for SaaS products.")
    priya = candidate("Priya Deshmukh", "priya.deshmukh@example.com", "Frontend Developer | Angular", "Mumbai", "9967012345",
                      ["Angular", "TypeScript", "RxJS", "HTML/CSS"],
                      [{"degree": "B.Sc. Information Technology", "institute": "University of Mumbai", "year": 2022}],
                      [{"title": "Frontend Developer", "company": "Lotus Digital", "from": "2022-08", "description": "Angular dashboards for retail clients."}])
    rohan = candidate("Rohan Patil", "rohan.patil@example.com", "Angular Developer", "Pune", "9822098765",
                      ["Angular", "TypeScript", "Git", "REST APIs"],
                      [{"degree": "B.E. Information Technology", "institute": "Vishwakarma Institute of Technology", "year": 2021}],
                      [{"title": "Software Engineer", "company": "Infracore Systems", "from": "2021-09", "description": "Maintained an Angular admin portal."}])
    sneha = candidate("Sneha Iyer", "sneha.iyer@example.com", "Fresher | Angular enthusiast", "Bangalore", "9845011223",
                      ["Angular", "JavaScript", "HTML/CSS"],
                      [{"degree": "B.Tech Computer Science", "institute": "RV College of Engineering", "year": 2026}], [])
    kunal = candidate("Kunal Mehta", "kunal.mehta@example.com", "Python Developer", "Pune", "9730045566",
                      ["Python", "Flask", "MySQL", "REST APIs"],
                      [{"degree": "B.E. Computer Engineering", "institute": "COEP Pune", "year": 2022}],
                      [{"title": "Python Developer", "company": "DataBridge Labs", "from": "2022-07", "description": "Flask APIs and MySQL reporting jobs."}])
    ananya = candidate("Ananya Rao", "ananya.rao@example.com", "Backend Developer | Python", "Hyderabad", "9848077889",
                       ["Python", "SQL", "Docker", "Flask"],
                       [{"degree": "M.Sc. Computer Science", "institute": "University of Hyderabad", "year": 2021}],
                       [{"title": "Backend Developer", "company": "CloudNest", "from": "2021-10", "description": "Dockerised Python services."}])
    vikram = candidate("Vikram Singh", "vikram.singh@example.com", "Frontend Developer | React & Angular", "Delhi", "9811055667",
                       ["React", "TypeScript", "JavaScript", "Angular"],
                       [{"degree": "B.Tech Electronics", "institute": "Delhi Technological University", "year": 2020}],
                       [{"title": "Frontend Engineer", "company": "Metro Commerce", "from": "2020-08", "description": "Storefront UI in React, now moving to Angular."}])

    companies = {}
    for i, (name, industry, location, website, description) in enumerate(COMPANIES, start=1):
        email = "recruiter@jobhub.demo" if i == 1 else f"hr@{name.lower().replace(' ', '')}.example.com"
        recruiter = user("Neha Kulkarni" if i == 1 else f"{name} HR", email, "recruiter")
        db.session.flush()  # recruiter.id is needed for the company
        companies[i] = Company(recruiter_id=recruiter.id, name=name, industry=industry, location=location,
                               website=website, description=description)
        db.session.add(companies[i])
    db.session.flush()

    jobs = []
    for (title, company_no, location, job_type, mode, exp, lo, hi, cat_no, skill_names, posted, deadline_in) in JOBS:
        names = ", ".join(skill_names[:3])
        company = companies[company_no]
        job = Job(
            company_id=company.id, category_id=categories[cat_no].id, title=title, location=location, job_type=job_type,
            work_mode=mode, experience=exp, salary_min=lo, salary_max=hi,
            description=(f"{company.name} ({company.industry}) is hiring a {title}"
                         f"{' to work remotely' if location == 'Remote' else f' for its {location} office'}. "
                         f"You will work with {names}, collaborate with product and engineering teams, and own features from planning to release."),
            responsibilities=[r.replace("{s}", names) for r in RESPONSIBILITIES[cat_no]],
            requirements=[("Final-year student or recent graduate in Computer Science, IT or a related field" if exp == "Fresher"
                           else f"{exp} of hands-on professional experience with {names}"),
                          "Good written and spoken communication", "Comfortable with Git and agile ways of working"],
            benefits=(["Work-from-home allowance"] + BENEFITS[:3]) if mode == "Remote" else BENEFITS,
            posted_date=ago(posted), application_deadline=utcnow() + timedelta(days=deadline_in),
            status="Closed" if deadline_in < 0 else "Open")
        job.skills = [skills[n] for n in skill_names]
        db.session.add(job)
        jobs.append(job)
    db.session.flush()

    def apply_to(candidate_user, job_no, steps):
        app = Application(job_id=jobs[job_no - 1].id, candidate_id=candidate_user.id, status=steps[-1][0],
                          applied_at=ago(steps[0][1]), updated_at=ago(steps[-1][1]))
        for status, days in steps:
            app.history.append(ApplicationHistory(status=status, changed_at=ago(days)))
        db.session.add(app)
        return app

    app1 = apply_to(aarav, 1, [("Applied", 10), ("Under Review", 8), ("Shortlisted", 6), ("Interview", 3)])
    apply_to(aarav, 5, [("Applied", 7), ("Under Review", 5), ("Shortlisted", 2)])
    apply_to(aarav, 2, [("Applied", 5), ("Under Review", 3)])
    apply_to(aarav, 6, [("Applied", 2)])
    app5 = apply_to(aarav, 8, [("Applied", 22), ("Under Review", 20), ("Shortlisted", 18), ("Interview", 14), ("Selected", 9)])
    apply_to(aarav, 12, [("Applied", 15), ("Under Review", 12), ("Rejected", 8)])
    apply_to(priya, 1, [("Applied", 6), ("Under Review", 4)])
    apply_to(rohan, 1, [("Applied", 8), ("Under Review", 6), ("Shortlisted", 4)])
    apply_to(sneha, 1, [("Applied", 1)])
    apply_to(kunal, 4, [("Applied", 3)])
    apply_to(ananya, 4, [("Applied", 5), ("Under Review", 2)])
    apply_to(vikram, 9, [("Applied", 7), ("Under Review", 5), ("Shortlisted", 3)])
    apply_to(priya, 14, [("Applied", 2)])
    db.session.flush()

    db.session.add_all([
        Report(job_id=jobs[3].id, reporter_id=priya.id, status="Open", created_at=ago(2),
               reason="Misleading description: it asks for 5 years of experience but is listed as 1-3 years."),
        Report(job_id=jobs[9].id, reporter_id=rohan.id, status="Open", created_at=ago(1),
               reason="Looks like a duplicate of another posting."),
        Report(job_id=jobs[16].id, reporter_id=aarav.id, status="Dismissed", created_at=ago(6),
               reason="Spam: the recruiter asked me to pay a registration fee."),
    ])
    db.session.add_all([
        Interview(application=app1, scheduled_at=at(3, 11), mode="Online", location="Google Meet (link sent by email)", status="Scheduled"),
        Interview(application=app5, scheduled_at=at(-12, 15), mode="On-site", location="Zenith FinServe, Navi Mumbai office", status="Completed"),
    ])

    recruiter = User.query.filter_by(email="recruiter@jobhub.demo").one()
    for owner, kind, message, days, read in [
        (aarav, "interview", "Interview scheduled for Angular Developer at Nimbus Labs.", 3, False),
        (aarav, "application", "Your application for Full Stack Developer has been shortlisted.", 2, False),
        (aarav, "application", "Your application for Frontend Developer is under review.", 3, True),
        (aarav, "application", "Congratulations! You were selected for Software Developer at Zenith FinServe.", 9, True),
        (recruiter, "application", "New application received for Angular Developer from Sneha Iyer.", 1, False),
        (recruiter, "application", "New application received for Python Developer from Kunal Mehta.", 3, False),
        (recruiter, "interview", "Interview scheduled with Aarav Sharma for Angular Developer.", 4, True),
    ]:
        db.session.add(Notification(user_id=owner.id, type=kind, message=message, is_read=read, created_at=ago(days)))
    db.session.commit()
    print(f"Seeded {len(jobs)} jobs, {len(companies)} companies, {User.query.count()} users. Demo password: {DEMO_PASSWORD}")


if __name__ == "__main__":
    flask_app = create_app()
    if flask_app.config.get("APP_ENV") == "production" and "--force" not in sys.argv:
        sys.exit("seed.py creates demo accounts with a PUBLIC password. Do not run it on a live site.\n"
                 "Create your admin with:  python create_admin.py   (add --force here only if you really mean it).")
    with flask_app.app_context():
        if "--reset" in sys.argv:
            db.drop_all()
        db.create_all()
        if User.query.first():
            print("The database already has data. Run `python seed.py --reset` to start over.")
        else:
            run()
