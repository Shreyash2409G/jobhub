import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Category, Job, JobSearchParams, Paged } from '../models';

export interface SiteStats { openJobs: number; companies: number; cities: number; categories: number; }

/** Reads jobs from the Flask API. The total number of matches comes back in the X-Total-Count header. */
@Injectable({ providedIn: 'root' })
export class JobService {
  private http = inject(HttpClient);
  private api = environment.apiUrl;

  getJobs(params: JobSearchParams = {}): Observable<Paged<Job>> {
    // Built by hand with encodeURIComponent: Angular's HttpParams leaves "+" as it is, and the server would
    // read the "+" in "10+ LPA" as a space.
    const pairs: string[] = [];
    const add = (key: string, value: string | number | undefined | null) => {
      if (value !== undefined && value !== null && value !== '') pairs.push(`${key}=${encodeURIComponent(String(value))}`);
    };
    add('keyword', params.keyword?.trim());
    add('location', params.location);
    add('category', params.category);
    add('company', params.companyId);
    params.jobType?.forEach((v) => add('jobType', v));
    params.experience?.forEach((v) => add('experience', v));
    params.salary?.forEach((v) => add('salary', v));
    params.workMode?.forEach((v) => add('workMode', v));
    add('sort', params.sort);
    add('page', params.page);
    add('limit', params.limit);

    const url = `${this.api}/jobs${pairs.length ? '?' + pairs.join('&') : ''}`;
    return this.http.get<Job[]>(url, { observe: 'response' }).pipe(
      map((res) => ({ items: res.body ?? [], total: Number(res.headers.get('X-Total-Count') ?? res.body?.length ?? 0) }))
    );
  }

  /** Returns null when the job does not exist, so the page can show a not-found state. */
  getJob(id: number): Observable<Job | null> {
    return this.http.get<Job>(`${this.api}/jobs/${id}`).pipe(catchError((err) => this.nullOn404(err)));
  }

  getSimilar(job: Job): Observable<Job[]> {
    return this.http.get<Job[]>(`${this.api}/jobs/${job.id}/similar`);
  }

  getJobsByCompany(companyId: number): Observable<Job[]> {
    return this.getJobs({ companyId, limit: 50 }).pipe(map((page) => page.items));
  }

  /** Open jobs ranked by overlap with the candidate's skills (newest first as a fallback). */
  getRecommended(skillNames: string[], count = 6): Observable<Job[]> {
    const mine = new Set(skillNames.map((s) => s.toLowerCase()));
    return this.getJobs({ limit: 50 }).pipe(
      map(({ items }) => {
        const scored = items
          .map((job) => ({ job, score: job.skills.filter((s) => mine.has(s.name.toLowerCase())).length }))
          .sort((a, b) => b.score - a.score || +new Date(b.job.postedDate) - +new Date(a.job.postedDate));
        const matched = scored.filter((x) => x.score > 0);
        return (matched.length ? matched : scored).map((x) => x.job).slice(0, count);
      })
    );
  }

  reportJob(jobId: number, reason: string): Observable<unknown> {
    return this.http.post(`${this.api}/jobs/${jobId}/report`, { reason });
  }

  getCategories(): Observable<Category[]> {
    return this.http.get<Category[]>(`${this.api}/categories`);
  }

  getStats(): Observable<SiteStats> {
    return this.http.get<SiteStats>(`${this.api}/stats`);
  }

  private nullOn404(err: HttpErrorResponse): Observable<null> {
    return err.status === 404 ? of(null) : throwError(() => err);
  }
}
