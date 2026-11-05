import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Company } from '../models';

@Injectable({ providedIn: 'root' })
export class CompanyService {
  private http = inject(HttpClient);
  private api = environment.apiUrl;

  getCompanies(): Observable<Company[]> {
    return this.http.get<Company[]>(`${this.api}/companies`);
  }

  /** Returns null when the company does not exist. */
  getCompany(id: number): Observable<Company | null> {
    return this.http.get<Company>(`${this.api}/companies/${id}`).pipe(
      catchError((err: HttpErrorResponse) => (err.status === 404 ? of(null) : throwError(() => err)))
    );
  }
}
