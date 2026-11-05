-- JobHub MySQL schema (reference copy).
-- The Flask models create these same tables with `python seed.py` or `flask --app run init-db`.
-- Use this file to read the design, or to create the tables by hand in MySQL Workbench.

CREATE DATABASE IF NOT EXISTS jobhub CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE jobhub;

CREATE TABLE users (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(100) NOT NULL,
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role          ENUM('candidate','recruiter','admin') NOT NULL,
  is_active     TINYINT(1) NOT NULL DEFAULT 1,   -- admins can deactivate an account
  created_at    DATETIME NOT NULL,
  updated_at    DATETIME NOT NULL
);

CREATE TABLE skills (
  id   INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE
);

-- users 1:1 profiles (candidates only)
CREATE TABLE profiles (
  user_id    INT PRIMARY KEY,
  headline   VARCHAR(80),
  phone      VARCHAR(15),
  location   VARCHAR(100),
  about      TEXT,
  education  JSON,
  experience JSON,
  updated_at DATETIME NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE profile_skills (
  user_id  INT NOT NULL,
  skill_id INT NOT NULL,
  PRIMARY KEY (user_id, skill_id),
  FOREIGN KEY (user_id)  REFERENCES profiles(user_id) ON DELETE CASCADE,
  FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE
);

-- users 1:N resumes (file_name is shown to people, stored_name is the random name on disk)
CREATE TABLE resumes (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  user_id      INT NOT NULL,
  file_name    VARCHAR(255) NOT NULL,
  stored_name  VARCHAR(100) NOT NULL,
  file_size_kb INT NOT NULL,
  is_active    TINYINT(1) NOT NULL DEFAULT 1,
  uploaded_at  DATETIME NOT NULL,
  INDEX ix_resumes_user_id (user_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- recruiter (user) 1:1 company
CREATE TABLE companies (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  recruiter_id INT NOT NULL UNIQUE,
  name         VARCHAR(80) NOT NULL,
  industry     VARCHAR(100) NOT NULL,
  location     VARCHAR(100) NOT NULL,
  website      VARCHAR(255),
  description  TEXT NOT NULL,
  logo_url     VARCHAR(255),
  is_deleted   TINYINT(1) NOT NULL DEFAULT 0,   -- soft delete
  created_at   DATETIME NOT NULL,
  updated_at   DATETIME NOT NULL,
  FOREIGN KEY (recruiter_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE job_categories (
  id   INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(80) NOT NULL UNIQUE,
  icon VARCHAR(40)
);

-- company 1:N jobs. Salary is stored in LPA as salary_min / salary_max.
CREATE TABLE jobs (
  id                   INT AUTO_INCREMENT PRIMARY KEY,
  company_id           INT NOT NULL,
  category_id          INT NOT NULL,
  title                VARCHAR(100) NOT NULL,
  description          TEXT NOT NULL,
  responsibilities     JSON,
  requirements         JSON,
  benefits             JSON,
  location             VARCHAR(100) NOT NULL,
  job_type             ENUM('Full Time','Part Time','Internship','Contract') NOT NULL,
  work_mode            ENUM('On-site','Hybrid','Remote') NOT NULL,
  experience           ENUM('Fresher','1-3 years','3-5 years','5+ years') NOT NULL,
  salary_min           INT NOT NULL,
  salary_max           INT NOT NULL,
  posted_date          DATETIME NOT NULL,
  application_deadline DATETIME NOT NULL,
  status               ENUM('Open','Closed') NOT NULL DEFAULT 'Open',
  is_deleted           TINYINT(1) NOT NULL DEFAULT 0,   -- soft delete keeps old applications resolvable
  created_at           DATETIME NOT NULL,
  updated_at           DATETIME NOT NULL,
  INDEX ix_jobs_company_id (company_id),
  INDEX ix_jobs_category_id (category_id),
  INDEX ix_jobs_location (location),
  INDEX ix_jobs_posted_date (posted_date),
  INDEX ix_jobs_status (status),
  FOREIGN KEY (company_id)  REFERENCES companies(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES job_categories(id)
);

-- jobs N:N skills
CREATE TABLE job_skills (
  job_id   INT NOT NULL,
  skill_id INT NOT NULL,
  PRIMARY KEY (job_id, skill_id),
  FOREIGN KEY (job_id)   REFERENCES jobs(id) ON DELETE CASCADE,
  FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE
);

-- jobs 1:N applications, users 1:N applications.
-- UNIQUE(candidate_id, job_id) makes duplicate applications impossible, even with double clicks.
CREATE TABLE applications (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  job_id       INT NOT NULL,
  candidate_id INT NOT NULL,
  resume_id    INT NULL,
  status       ENUM('Applied','Under Review','Shortlisted','Interview','Selected','Rejected') NOT NULL DEFAULT 'Applied',
  applied_at   DATETIME NOT NULL,
  updated_at   DATETIME NOT NULL,
  CONSTRAINT uq_application_candidate_job UNIQUE (candidate_id, job_id),
  INDEX ix_applications_job_id (job_id),
  INDEX ix_applications_candidate_id (candidate_id),
  FOREIGN KEY (job_id)       REFERENCES jobs(id) ON DELETE CASCADE,
  FOREIGN KEY (candidate_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (resume_id)    REFERENCES resumes(id) ON DELETE SET NULL
);

-- One row per status change: the candidate's timeline.
CREATE TABLE application_history (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  application_id INT NOT NULL,
  status         ENUM('Applied','Under Review','Shortlisted','Interview','Selected','Rejected') NOT NULL,
  changed_at     DATETIME NOT NULL,
  INDEX ix_history_application_id (application_id),
  FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE
);

CREATE TABLE interviews (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  application_id INT NOT NULL,
  scheduled_at   DATETIME NOT NULL,
  mode           ENUM('Online','On-site') NOT NULL,
  location       VARCHAR(255),
  status         ENUM('Scheduled','Completed','Cancelled') NOT NULL DEFAULT 'Scheduled',
  created_at     DATETIME NOT NULL,
  INDEX ix_interviews_application_id (application_id),
  FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE
);

-- users 1:N saved_jobs
CREATE TABLE saved_jobs (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  user_id    INT NOT NULL,
  job_id     INT NOT NULL,
  created_at DATETIME NOT NULL,
  CONSTRAINT uq_saved_user_job UNIQUE (user_id, job_id),
  INDEX ix_saved_jobs_user_id (user_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (job_id)  REFERENCES jobs(id) ON DELETE CASCADE
);

-- users 1:N notifications
CREATE TABLE notifications (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  user_id    INT NOT NULL,
  type       ENUM('application','interview','system') NOT NULL,
  message    VARCHAR(255) NOT NULL,
  is_read    TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL,
  INDEX ix_notifications_user_id (user_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Reported jobs for the admin moderation screen (endpoints arrive in Phase 8)
CREATE TABLE reports (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  job_id      INT NOT NULL,
  reporter_id INT NOT NULL,
  reason      VARCHAR(255) NOT NULL,
  status      ENUM('Open','Resolved','Dismissed') NOT NULL DEFAULT 'Open',
  created_at  DATETIME NOT NULL,
  INDEX ix_reports_job_id (job_id),
  FOREIGN KEY (job_id)      REFERENCES jobs(id) ON DELETE CASCADE,
  FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE CASCADE
);
