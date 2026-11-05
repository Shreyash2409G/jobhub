import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, map, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthResponse, LoginRequest, RegisterRequest, User, UserRole } from '../models';
import { apiMessage } from '../utils/api-error';
import { ToastService } from './toast.service';

const TOKEN_KEY = 'jobhub_token';
const USER_KEY = 'jobhub_user';

/** Public logins created by backend/seed.py, used by the navbar "Demo accounts" menu. */
const DEMO_PASSWORD = 'Password@123';
const DEMO_EMAILS: Record<UserRole, string> = {
  candidate: 'candidate@jobhub.demo',
  recruiter: 'recruiter@jobhub.demo',
  admin: 'admin@jobhub.demo',
};

/**
 * Central auth state. The JWT comes from the Flask API (POST /api/auth/login or /register) and is attached
 * to every API request by authInterceptor. Passwords are only sent to the API, never stored here.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private toast = inject(ToastService);

  private _user = signal<User | null>(this.readStoredUser());
  readonly user = this._user.asReadonly();
  readonly isLoggedIn = computed(() => this._user() !== null);
  readonly role = computed(() => this._user()?.role ?? null);
  /** Changes only when a different user logs in (not when the same user edits their name). */
  readonly sessionKey = computed(() => {
    const u = this._user();
    return u ? `${u.role}:${u.id}` : '';
  });

  get token(): string | null { return localStorage.getItem(TOKEN_KEY); }

  homeRoute(role: UserRole): string {
    return { candidate: '/dashboard', recruiter: '/recruiter/dashboard', admin: '/admin/dashboard' }[role];
  }

  login(req: LoginRequest): Observable<User> {
    return this.http.post<AuthResponse>(`${environment.apiUrl}/auth/login`, req).pipe(
      tap((res) => this.startSession(res)),
      map((res) => res.user)
    );
  }

  register(req: RegisterRequest): Observable<User> {
    return this.http.post<AuthResponse>(`${environment.apiUrl}/auth/register`, req).pipe(
      tap((res) => this.startSession(res)),
      map((res) => res.user)
    );
  }

  /** Called once when the app starts: confirms the stored token is still valid and refreshes the user. */
  verifySession(): void {
    if (!this.token) return;
    this.http.get<User>(`${environment.apiUrl}/auth/me`).subscribe({
      next: (user) => this.setUser(user),
      error: () => { /* a 401 is handled by errorInterceptor (logout) */ },
    });
  }

  /** Quick login with a seeded demo account (real API call). */
  demoLogin(role: UserRole): void {
    this.login({ email: DEMO_EMAILS[role], password: DEMO_PASSWORD }).subscribe({
      next: (user) => this.router.navigateByUrl(this.homeRoute(user.role)),
      error: (err) => this.toast.error(apiMessage(err)),
    });
  }

  updateName(name: string): Observable<User> {
    return this.http.put<{ user: User }>(`${environment.apiUrl}/users/profile`, { name: name.trim() }).pipe(
      tap((res) => this.setUser(res.user)),
      map((res) => res.user)
    );
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this._user.set(null);
    this.router.navigateByUrl('/');
  }

  private startSession(res: AuthResponse): void {
    localStorage.setItem(TOKEN_KEY, res.token);
    this.setUser(res.user);
  }

  private setUser(user: User): void {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    this._user.set(user);
  }

  private readStoredUser(): User | null {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw && localStorage.getItem(TOKEN_KEY) ? (JSON.parse(raw) as User) : null;
    } catch {
      return null;
    }
  }
}
