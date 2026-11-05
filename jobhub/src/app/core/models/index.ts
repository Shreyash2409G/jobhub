export type UserRole = 'candidate' | 'recruiter' | 'admin';
export type JobType = 'Full Time' | 'Part Time' | 'Internship' | 'Contract';
export type WorkMode = 'On-site' | 'Hybrid' | 'Remote';
export type ExperienceBand = 'Fresher' | '1-3 years' | '3-5 years' | '5+ years';
export type JobStatus = 'Open' | 'Closed';
export type ApplicationStatus =
  | 'Applied' | 'Under Review' | 'Shortlisted' | 'Interview' | 'Selected' | 'Rejected';
export type SortOption = 'newest' | 'salary_asc' | 'salary_desc' | 'relevance';
export type InterviewStatus = 'Scheduled' | 'Completed' | 'Cancelled';

/** Pipeline order, used by the status timeline. */
export const APPLICATION_STATUS_FLOW: ApplicationStatus[] =
  ['Applied', 'Under Review', 'Shortlisted', 'Interview', 'Selected'];

/** Never include a password field in frontend models. */
export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  createdAt?: string;
}

export interface LoginRequest { email: string; password: string; }
export interface RegisterRequest {
  name: string; email: string; password: string; role: Exclude<UserRole, 'admin'>;
}
export interface AuthResponse { token: string; user: User; }

export interface Skill { id: number; name: string; }
export interface Category { id: number; name: string; icon?: string; jobCount?: number; }

export interface Education { degree: string; institute: string; year: number; }
export interface Experience { title: string; company: string; from: string; to?: string; description?: string; }

export interface Profile {
  userId: number;
  phone?: string;
  location?: string;
  headline?: string;
  about?: string;
  skills: Skill[];
  education: Education[];
  experience: Experience[];
}

export interface Resume {
  id: number; userId: number; fileName: string; fileSizeKb: number; uploadedAt: string;
}

/** Snapshot of a candidate taken when they apply (what the recruiter sees). */
export interface ApplicantInfo {
  name: string;
  email: string;
  phone?: string;
  location?: string;
  headline?: string;
  about?: string;
  skills: Skill[];
  education: Education[];
  experience: Experience[];
  resumeName?: string;
  resumeId?: number; // lets a recruiter download the resume
}

export interface Company {
  id: number;
  recruiterId?: number;
  name: string;
  logoUrl?: string;
  description: string;
  website?: string;
  location: string;
  industry: string;
  openJobs?: number;
}

export interface Job {
  id: number;
  title: string;
  company: Company;
  location: string;
  jobType: JobType;
  workMode: WorkMode;
  experience: ExperienceBand;
  salaryMin: number; // in LPA
  salaryMax: number; // in LPA
  description: string;
  responsibilities: string[];
  requirements: string[];
  benefits: string[];
  skills: Skill[];
  category: Category;
  postedDate: string;
  applicationDeadline: string;
  status: JobStatus;
  isDeleted?: boolean; // soft delete, so old applications still resolve
  applicantCount?: number; // only on a recruiter's own jobs
}

export interface StatusChange { status: ApplicationStatus; at: string; }

export interface Application {
  id: number;
  jobId: number;
  candidateId: number;
  status: ApplicationStatus;
  appliedAt: string;
  updatedAt: string;
  history: StatusChange[];
  job?: Job;
  candidate?: ApplicantInfo;
}

export interface Interview {
  id: number;
  applicationId: number;
  scheduledAt: string;
  mode: 'Online' | 'On-site';
  location?: string;
  status: InterviewStatus;
  job?: Job;
  candidateName?: string; // set for recruiters
}

export interface Notification {
  id: number;
  userId: number;
  message: string;
  type: 'application' | 'interview' | 'system';
  isRead: boolean;
  createdAt: string;
}

/** Query params for GET /api/jobs */
export interface JobSearchParams {
  keyword?: string;
  category?: number;
  companyId?: number;
  location?: string;
  jobType?: JobType[];
  experience?: ExperienceBand[];
  salary?: string[];
  workMode?: WorkMode[];
  sort?: SortOption;
  page?: number;
  limit?: number;
}
export interface Paged<T> { items: T[]; total: number; }


// ----- admin -----
export interface AdminStats {
  totals: { users: number; recruiters: number; companies: number; jobs: number; applications: number; openReports: number };
  funnel: { status: string; count: number }[]; // applications that passed through each stage
  rejected: number;
  jobsByCategory: { name: string; count: number }[];
  usersByRole: { role: string; count: number }[];
  applicationsPerDay: { date: string; count: number }[];
}
export interface AdminUser extends User { isActive: boolean; companyName?: string | null; jobCount?: number; }
export interface AdminCompany extends Company { isDeleted: boolean; recruiterName: string; recruiterEmail: string; jobCount: number; }
export interface AdminJob extends Job { applicantCount: number; openReports: number; }
export type ReportStatus = 'Open' | 'Resolved' | 'Dismissed';
export interface JobReport {
  id: number; jobId: number; jobTitle: string; jobStatus: JobStatus; jobRemoved: boolean; companyName: string;
  reporterName: string; reason: string; status: ReportStatus; createdAt: string;
}
