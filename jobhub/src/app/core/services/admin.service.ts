import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AdminCompany, AdminJob, AdminStats, AdminUser, Category, JobReport, Paged, ReportStatus } from '../models';

/** What every admin table sends: search text, one filter value, and the page. */
export interface ListQuery { q: string; filter: string; page: number; limit: number; }

/** Admin screens. Every call needs an admin JWT (the API answers 403 for anyone else). */
@Injectable({ providedIn: 'root' })
export class AdminService {
  private http = inject(HttpClient);
  private api = `${environment.apiUrl}/admin`;

  getStats(): Observable<AdminStats> { return this.http.get<AdminStats>(`${this.api}/stats`); }

  users(query: ListQuery): Observable<Paged<AdminUser>> { return this.list('users', query, 'role'); }
  setUserActive(id: number, isActive: boolean): Observable<AdminUser> {
    return this.http.put<AdminUser>(`${this.api}/users/${id}`, { isActive });
  }

  companies(query: ListQuery): Observable<Paged<AdminCompany>> { return this.list('companies', query, 'status'); }
  setCompanyRemoved(id: number, isDeleted: boolean): Observable<AdminCompany> {
    return this.http.put<AdminCompany>(`${this.api}/companies/${id}`, { isDeleted });
  }

  jobs(query: ListQuery): Observable<Paged<AdminJob>> { return this.list('jobs', query, 'status'); }
  updateJob(id: number, change: { status?: 'Open' | 'Closed'; isDeleted?: boolean }): Observable<AdminJob> {
    return this.http.put<AdminJob>(`${this.api}/jobs/${id}`, change);
  }

  createCategory(body: { name: string; icon?: string }): Observable<Category> {
    return this.http.post<Category>(`${this.api}/categories`, body);
  }
  updateCategory(id: number, body: { name: string; icon?: string }): Observable<Category> {
    return this.http.put<Category>(`${this.api}/categories/${id}`, body);
  }
  deleteCategory(id: number): Observable<void> { return this.http.delete<void>(`${this.api}/categories/${id}`); }

  reports(query: ListQuery): Observable<Paged<JobReport>> { return this.list('reports', query, 'status'); }
  reviewReport(id: number, status: Exclude<ReportStatus, 'Open'>, closeJob = false): Observable<JobReport> {
    return this.http.put<JobReport>(`${this.api}/reports/${id}`, { status, closeJob });
  }

  /** GET /api/admin/<path>?q=&<filterName>=&page=&limit= ; the total is in the X-Total-Count header. */
  private list<T>(path: string, query: ListQuery, filterName: string): Observable<Paged<T>> {
    const pairs = [`page=${query.page}`, `limit=${query.limit}`];
    if (query.q) pairs.push(`q=${encodeURIComponent(query.q)}`);
    if (query.filter) pairs.push(`${filterName}=${encodeURIComponent(query.filter)}`);
    return this.http.get<T[]>(`${this.api}/${path}?${pairs.join('&')}`, { observe: 'response' }).pipe(
      map((res) => ({ items: res.body ?? [], total: Number(res.headers.get('X-Total-Count') ?? res.body?.length ?? 0) }))
    );
  }
}
