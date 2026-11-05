import { HttpClient } from '@angular/common/http';
import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { Observable, finalize, forkJoin, map, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Application, Interview, Job, Notification, Profile, Resume, User } from '../models';
import { AuthService } from './auth.service';

export interface NotificationPrefs { applicationUpdates: boolean; interviewReminders: boolean; jobRecommendations: boolean; }

const DEFAULT_PREFS: NotificationPrefs = { applicationUpdates: true, interviewReminders: true, jobRecommendations: false };
const emptyProfile = (): Profile => ({ userId: 0, skills: [], education: [], experience: [] });
const prefsKey = (userId: number) => `jobhub_prefs_${userId}`;

/**
 * Everything the logged-in job seeker sees, kept in signals and loaded from the Flask API when they log in.
 * Pages read the signals; the methods below call the API and update the signals when it answers.
 */
@Injectable({ providedIn: 'root' })
export class CandidateService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private api = environment.apiUrl;

  readonly saved = signal<Job[]>([]);
  readonly applications = signal<Application[]>([]);
  readonly interviews = signal<Interview[]>([]);
  readonly notifications = signal<Notification[]>([]);
  readonly resume = signal<Resume | null>(null);
  readonly profile = signal<Profile>(emptyProfile());
  /** Email preferences are kept in this browser only: the API has no endpoint for them yet. */
  readonly prefs = signal<NotificationPrefs>(DEFAULT_PREFS);
  /** False while the first load after login is running (the layout shows a spinner). */
  readonly ready = signal(false);

  readonly unreadCount = computed(() => this.notifications().filter((n) => !n.isRead).length);
  readonly upcomingInterviews = computed(() =>
    this.interviews()
      .filter((i) => i.status === 'Scheduled' && new Date(i.scheduledAt) >= new Date())
      .sort((a, b) => +new Date(a.scheduledAt) - +new Date(b.scheduledAt))
  );

  readonly completion = computed(() => {
    const p = this.profile();
    const checks: [string, boolean][] = [
      ['Add a professional headline', !!p.headline],
      ['Add your phone number', !!p.phone],
      ['Add your location', !!p.location],
      ['Write a short summary', !!p.about],
      ['Add at least 3 skills', p.skills.length >= 3],
      ['Add your education', p.education.length > 0],
      ['Add work experience or internships', p.experience.length > 0],
      ['Upload your resume', !!this.resume()],
    ];
    return {
      percent: Math.round((checks.filter(([, ok]) => ok).length / checks.length) * 100),
      missing: checks.filter(([, ok]) => !ok).map(([label]) => label),
    };
  });

  constructor() {
    // Load when a candidate logs in, clear when anyone else (or nobody) is logged in.
    effect(() => {
      const key = this.auth.sessionKey();
      untracked(() => (key.startsWith('candidate:') ? this.load(Number(key.split(':')[1])) : this.reset()));
    });
  }

  isSaved(jobId: number): boolean { return this.saved().some((j) => j.id === jobId); }
  hasApplied(jobId: number): boolean { return this.applications().some((a) => a.jobId === jobId); }
  getApplication(id: number): Application | undefined { return this.applications().find((a) => a.id === id); }

  /** Emits true when the job is now saved, false when it was removed. */
  toggleSave(job: Job): Observable<boolean> {
    if (this.isSaved(job.id)) {
      return this.http.delete<void>(`${this.api}/saved-jobs/${job.id}`).pipe(
        tap(() => this.saved.update((list) => list.filter((j) => j.id !== job.id))),
        map(() => false)
      );
    }
    return this.http.post<Job>(`${this.api}/saved-jobs`, { jobId: job.id }).pipe(
      tap((saved) => this.saved.update((list) => [saved, ...list.filter((j) => j.id !== saved.id)])),
      map(() => true)
    );
  }

  /** The API also creates the notifications; they are fetched again afterwards. */
  apply(job: Job): Observable<Application> {
    return this.http.post<Application>(`${this.api}/applications`, { jobId: job.id }).pipe(
      tap((application) => {
        this.applications.update((list) => [application, ...list]);
        this.refreshNotifications();
      })
    );
  }

  saveProfile(profile: Profile): Observable<Profile> {
    // Empty text is sent as "" (not left out) so the API clears the field.
    const body = {
      headline: profile.headline ?? '', phone: profile.phone ?? '', location: profile.location ?? '', about: profile.about ?? '',
      skills: profile.skills, education: profile.education, experience: profile.experience,
    };
    return this.http.put<{ user: User; profile: Profile }>(`${this.api}/users/profile`, body).pipe(
      tap((res) => this.profile.set(res.profile)),
      map((res) => res.profile)
    );
  }

  uploadResume(file: File): Observable<Resume> {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<Resume>(`${this.api}/users/resume`, form).pipe(tap((resume) => this.resume.set(resume)));
  }

  removeResume(): Observable<void> {
    return this.http.delete<void>(`${this.api}/users/resume`).pipe(tap(() => this.resume.set(null)));
  }

  markRead(id: number): void {
    if (this.notifications().find((n) => n.id === id)?.isRead !== false) return; // already read
    this.notifications.update((list) => list.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    this.http.put(`${this.api}/notifications/${id}/read`, {}).subscribe({ error: () => this.refreshNotifications() });
  }

  markAllRead(): void {
    this.notifications.update((list) => list.map((n) => ({ ...n, isRead: true })));
    this.http.put(`${this.api}/notifications/read-all`, {}).subscribe({ error: () => this.refreshNotifications() });
  }

  updatePrefs(prefs: NotificationPrefs): void {
    this.prefs.set(prefs);
    const userId = this.auth.user()?.id;
    if (userId !== undefined) localStorage.setItem(prefsKey(userId), JSON.stringify(prefs));
  }

  private load(userId: number): void {
    this.ready.set(false);
    this.prefs.set(this.readPrefs(userId));
    forkJoin({
      applications: this.http.get<Application[]>(`${this.api}/applications/my`),
      saved: this.http.get<Job[]>(`${this.api}/saved-jobs`),
      interviews: this.http.get<Interview[]>(`${this.api}/interviews`),
      notifications: this.http.get<Notification[]>(`${this.api}/notifications`),
      profile: this.http.get<{ user: User; profile: Profile | null }>(`${this.api}/users/profile`),
      resume: this.http.get<Resume | null>(`${this.api}/users/resume`),
    })
      .pipe(finalize(() => this.ready.set(true)))
      .subscribe({
        next: (data) => {
          this.applications.set(data.applications);
          this.saved.set(data.saved);
          this.interviews.set(data.interviews);
          this.notifications.set(data.notifications);
          this.profile.set(data.profile.profile ?? emptyProfile());
          this.resume.set(data.resume);
        },
        error: () => { /* errorInterceptor already told the user */ },
      });
  }

  private reset(): void {
    this.saved.set([]);
    this.applications.set([]);
    this.interviews.set([]);
    this.notifications.set([]);
    this.resume.set(null);
    this.profile.set(emptyProfile());
    this.ready.set(false);
  }

  private refreshNotifications(): void {
    this.http.get<Notification[]>(`${this.api}/notifications`).subscribe({
      next: (list) => this.notifications.set(list),
      error: () => { /* keep what we have */ },
    });
  }

  private readPrefs(userId: number): NotificationPrefs {
    try {
      const raw = localStorage.getItem(prefsKey(userId));
      return raw ? { ...DEFAULT_PREFS, ...(JSON.parse(raw) as Partial<NotificationPrefs>) } : DEFAULT_PREFS;
    } catch {
      return DEFAULT_PREFS;
    }
  }
}
