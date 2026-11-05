import { Component, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { switchMap } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { CompanyService } from '../../core/services/company.service';
import { JobService } from '../../core/services/job.service';
import { CompanyLogoComponent } from '../../shared/components/company-logo.component';
import { JobCardComponent } from '../../shared/components/job-card.component';
import { LoadingComponent } from '../../shared/components/loading.component';
import { EmptyStateComponent } from '../../shared/components/empty-state.component';

@Component({
  selector: 'app-company-details',
  imports: [RouterLink, MatButtonModule, MatIconModule, CompanyLogoComponent, JobCardComponent, LoadingComponent, EmptyStateComponent],
  template: `
    <div class="container page">
      @if (company() === undefined) {
        <app-loading message="Loading company…" />
      } @else if (company() === null) {
        <div class="card"><app-empty-state icon="business" title="Company not found">
          <a mat-flat-button routerLink="/companies">Browse companies</a></app-empty-state></div>
      } @else {
        @let c = company()!;
        <a routerLink="/companies">← Back to companies</a>
        <div class="card head">
          <app-company-logo [name]="c.name" [size]="72" />
          <div>
            <h1>{{ c.name }}</h1>
            <div class="row">
              <span class="chip">{{ c.industry }}</span>
              <span class="chip"><mat-icon>place</mat-icon>{{ c.location }}</span>
              @if (c.website) { <a class="chip" [href]="c.website" target="_blank" rel="noopener">Website</a> }
            </div>
            <p class="about">{{ c.description }}</p>
          </div>
        </div>

        <h2>Open jobs ({{ jobs().length }})</h2>
        @if (jobs().length) {
          <div class="grid">@for (j of jobs(); track j.id) { <app-job-card [job]="j" /> }</div>
        } @else {
          <div class="card"><app-empty-state icon="work_outline" title="No open jobs right now" message="Check back soon." /></div>
        }
      }
    </div>
  `,
  styles: `
    .page { padding-top: 24px; padding-bottom: 64px; }
    .head { display: flex; gap: 20px; margin: 16px 0 32px; align-items: flex-start; }
    .head h1 { font-size: 1.8rem; margin-bottom: 8px; }
    .about { margin: 16px 0 0; max-width: 70ch; }
    @media (max-width: 600px) { .head { flex-direction: column; } }
  `,
})
export class CompanyDetailsComponent {
  id = input('');
  private companyService = inject(CompanyService);
  private jobService = inject(JobService);

  company = toSignal(toObservable(this.id).pipe(switchMap((id) => this.companyService.getCompany(+id))), { initialValue: undefined });
  jobs = toSignal(toObservable(this.id).pipe(switchMap((id) => this.jobService.getJobsByCompany(+id))), { initialValue: [] });
}
