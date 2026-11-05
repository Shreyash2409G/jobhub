import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { Observable, catchError, finalize, forkJoin, map, of, switchMap, tap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Application, ApplicationStatus, Company, ExperienceBand, Interview, InterviewStatus, Job, JobType, Notification, Skill, WorkMode } from '../models';
import { AuthService } from './auth.service';

export interface CompanyInput { name: string; industry: string; location: string; website?: string; description: string; }

export interface JobInput {
  title: string; description: string; responsibilities: string[]; requirements: string[]; benefits: string[];
  skills: Skill[]; location: string; jobType: JobType; experience: ExperienceBand; workMode: WorkMode;
  salaryMin: number; salaryMax: number; applicationDeadline: string; categoryId: number;
}

export interface InterviewInput { scheduledAt: string; mode: 'Online' | 'On-site'; location?: string; }

/**
 * Which status a recruiter may move an application to next. The API enforces the same rules;
 * this copy only decides which buttons to show. "Interview" is reached by scheduling an interview.
 */
const NEXT: Record<ApplicationStatus, ApplicationStatus[]> = {
  'Applied': ['Under Review', 'Shortlisted', 'Rejected'],
  'Under Review': ['Shortlisted', 'Rejected'],
  'Shortlisted': ['Interview', 'Rejected'],
  'Interview': ['Selected', 'Rejected'],
  'Selected': [],
  'Rejected': [],
};

/**
 * Everything the logged-in recruiter manages, kept in signals and loaded from the Flask API at login.
 * Each method calls the API and updates the signals when it answers.
 */
@Injectable({ providedIn: 'root' })
export class RecruiterService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private api = environment.apiUrl;

  readonly company = signal<Company | null>(null);
  /** The recruiter's jobs, open and closed (soft-deleted jobs are not returned). */
  readonly jobs = signal<Job[]>([]);
  readonly applicants = signal<Application[]>([]);
  readonly interviews = signal<Interview[]>([]);
  readonly notifications = signal<Notification[]>([]);
  readonly ready = signal(false);

  readonly unreadCount = computed(() => this.notifications().filter((n) => !n.isRead).length);

  readonly stats = computed(() => ({
    totalJobs: this.jobs().length,
    activeJobs: this.jobs().filter((j) => j.status === 'Open').length,
    applications: this.applicants().length,
    shortlisted: this.applicants().filter((a) => a.status === 'Shortlisted').length,
    interviews: this.interviews().filter((i) => i.status === 'Scheduled').length,
  }));

  constructor() {
    effect(() => {
      const key = this.auth.sessionKey();
      untracked(() => (key.startsWith('recruiter:') ? this.load() : this.reset()));
    });
  }

  getJob(id: number): Job | undefined { return this.jobs().find((j) => j.id === id); }
  getApplicant(id: number): Application | undefined { return this.applicants().find((a) => a.id === id); }
  applicantsFor(jobId: number): Application[] { return this.applicants().filter((a) => a.jobId === jobId); }
  interviewFor(applicationId: number): Interview | undefined {
    return this.interviews().find((i) => i.applicationId === applicationId && i.status !== 'Cancelled')
      ?? this.interviews().find((i) => i.applicationId === applicationId);
  }

  // ----- company -----
  saveCompany(input: CompanyInput): Observable<Company> {
    const request = this.company()
      ? this.http.put<Company>(`${this.api}/companies`, input)
      : this.http.post<Company>(`${this.api}/companies`, input);
    return request.pipe(tap((company) => this.company.set(company)));
  }

  // ----- jobs -----
  createJob(input: JobInput): Observable<Job> {
    return this.http.post<Job>(`${this.api}/jobs`, input).pipe(
      tap((job) => this.jobs.update((list) => [{ ...job, applicantCount: 0 }, ...list]))
    );
  }

  updateJob(id: number, input: JobInput): Observable<Job> {
    return this.http.put<Job>(`${this.api}/jobs/${id}`, input).pipe(tap((job) => this.replaceJob(job)));
  }

  setJobStatus(id: number, status: 'Open' | 'Closed'): Observable<Job> {
    return this.http.put<Job>(`${this.api}/jobs/${id}`, { status }).pipe(tap((job) => this.replaceJob(job)));
  }

  deleteJob(id: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/jobs/${id}`).pipe(
      tap(() => this.jobs.update((list) => list.filter((j) => j.id !== id)))
    );
  }

  // ----- applicants -----
  canMoveTo(app: Application, status: ApplicationStatus): boolean { return NEXT[app.status].includes(status); }

  canSchedule(app: Application): boolean {
    if (app.status === 'Shortlisted') return true;
    return app.status === 'Interview' && !this.interviews().some((i) => i.applicationId === app.id && i.status === 'Scheduled');
  }

  /** Applied -> Under Review -> Shortlisted -> (Interview via scheduling) -> Selected / Rejected. */
  setStatus(applicationId: number, status: ApplicationStatus): Observable<Application> {
    return this.http.put<Application>(`${this.api}/applications/${applicationId}/status`, { status }).pipe(
      tap((application) => this.replaceApplicant(application))
    );
  }

  /** Scheduling also moves the application to "Interview" on the server, so it is fetched again. */
  scheduleInterview(applicationId: number, input: InterviewInput): Observable<Interview> {
    return this.http.post<Interview>(`${this.api}/applications/${applicationId}/interview`, input).pipe(
      tap((interview) => this.interviews.update((list) => [interview, ...list])),
      switchMap((interview) =>
        this.http.get<Application>(`${this.api}/applications/${applicationId}`).pipe(
          tap((application) => this.replaceApplicant(application)),
          map(() => interview)
        )
      )
    );
  }

  setInterviewStatus(id: number, status: InterviewStatus): Observable<Interview> {
    return this.http.put<Interview>(`${this.api}/interviews/${id}/status`, { status }).pipe(
      tap((interview) => this.interviews.update((list) => list.map((i) => (i.id === interview.id ? interview : i))))
    );
  }

  // ----- notifications -----
  markRead(id: number): void {
    if (this.notifications().find((n) => n.id === id)?.isRead !== false) return; // already read
    this.notifications.update((list) => list.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    this.http.put(`${this.api}/notifications/${id}/read`, {}).subscribe({ error: () => this.refreshNotifications() });
  }

  markAllRead(): void {
    this.notifications.update((list) => list.map((n) => ({ ...n, isRead: true })));
    this.http.put(`${this.api}/notifications/read-all`, {}).subscribe({ error: () => this.refreshNotifications() });
  }

  // ----- internals -----
  private replaceJob(job: Job): void {
    this.jobs.update((list) => list.map((j) => (j.id === job.id ? { ...job, applicantCount: j.applicantCount } : j)));
  }

  private replaceApplicant(application: Application): void {
    this.applicants.update((list) => list.map((a) => (a.id === application.id ? application : a)));
  }

  private load(): void {
    this.ready.set(false);
    forkJoin({
      // 404 simply means "no company yet"
      company: this.http.get<Company>(`${this.api}/companies/me`).pipe(
        catchError((err: HttpErrorResponse) => (err.status === 404 ? of(null) : throwError(() => err)))
      ),
      jobs: this.http.get<Job[]>(`${this.api}/jobs/mine`),
      applicants: this.http.get<Application[]>(`${this.api}/applications/received`),
      interviews: this.http.get<Interview[]>(`${this.api}/interviews`),
      notifications: this.http.get<Notification[]>(`${this.api}/notifications`),
    })
      .pipe(finalize(() => this.ready.set(true)))
      .subscribe({
        next: (data) => {
          this.company.set(data.company);
          this.jobs.set(data.jobs);
          this.applicants.set(data.applicants);
          this.interviews.set(data.interviews);
          this.notifications.set(data.notifications);
        },
        error: () => { /* errorInterceptor already told the user */ },
      });
  }

  private reset(): void {
    this.company.set(null);
    this.jobs.set([]);
    this.applicants.set([]);
    this.interviews.set([]);
    this.notifications.set([]);
    this.ready.set(false);
  }

  private refreshNotifications(): void {
    this.http.get<Notification[]>(`${this.api}/notifications`).subscribe({
      next: (list) => this.notifications.set(list),
      error: () => { /* keep what we have */ },
    });
  }
}
