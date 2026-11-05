import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { JobService } from '../../core/services/job.service';
import { CompanyService } from '../../core/services/company.service';
import { LOCATIONS } from '../../core/constants/lookups';
import { JobCardComponent } from '../../shared/components/job-card.component';
import { CompanyCardComponent } from '../../shared/components/company-card.component';
import { LoadingComponent } from '../../shared/components/loading.component';

@Component({
  selector: 'app-home',
  imports: [ReactiveFormsModule, RouterLink, MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule,
    MatSelectModule, JobCardComponent, CompanyCardComponent, LoadingComponent],
  template: `
    <section class="hero">
      <div class="container hero__inner">
        <h1>Find Your Next Opportunity</h1>
        <p>Search jobs from companies hiring in Mumbai, Pune, Bangalore, Hyderabad, Delhi and remotely.</p>

        <form class="card search" [formGroup]="form" (ngSubmit)="search()">
          <mat-form-field appearance="outline" subscriptSizing="dynamic">
            <mat-label>Job title, skills or company</mat-label>
            <mat-icon matPrefix>search</mat-icon>
            <input matInput formControlName="keyword" placeholder="e.g. Angular Developer">
          </mat-form-field>
          <mat-form-field appearance="outline" subscriptSizing="dynamic">
            <mat-label>Location</mat-label>
            <mat-icon matPrefix>place</mat-icon>
            <mat-select formControlName="location">
              <mat-option value="">All locations</mat-option>
              @for (loc of locations; track loc) { <mat-option [value]="loc">{{ loc }}</mat-option> }
            </mat-select>
          </mat-form-field>
          <button mat-flat-button type="submit">Search jobs</button>
        </form>
      </div>
    </section>

    @if (stats(); as s) {
      <section class="container stats">
        <div><strong>{{ s.openJobs }}</strong><span>open jobs</span></div>
        <div><strong>{{ s.companies }}</strong><span>hiring companies</span></div>
        <div><strong>{{ s.cities }}</strong><span>locations</span></div>
        <div><strong>{{ s.categories }}</strong><span>job categories</span></div>
      </section>
    }

    <section class="container section">
      <h2>Popular job categories</h2>
      <div class="grid cats">
        @for (c of categories(); track c.id) {
          <a class="card cat" [routerLink]="['/jobs']" [queryParams]="{ category: c.id }">
            <mat-icon>{{ c.icon }}</mat-icon>
            <div><h3>{{ c.name }}</h3><span class="text-muted">{{ c.jobCount }} open jobs</span></div>
          </a>
        }
      </div>
    </section>

    <section class="container section">
      <div class="row head"><h2>Latest jobs</h2><a mat-button routerLink="/jobs">View all jobs</a></div>
      @if (latest(); as res) {
        <div class="grid">@for (job of res.items.slice(0, 6); track job.id) { <app-job-card [job]="job" /> }</div>
      } @else { <app-loading message="Loading jobs…" /> }
    </section>

    <section class="container section">
      <div class="row head"><h2>Featured companies</h2><a mat-button routerLink="/companies">View all companies</a></div>
      <div class="grid">@for (c of companies().slice(0, 4); track c.id) { <app-company-card [company]="c" /> }</div>
    </section>

    <section class="container section">
      <h2>How JobHub works</h2>
      <ol class="grid steps">
        <li class="card"><h3>1. Search jobs</h3><p class="text-muted">Filter by title, skills, location, salary and work mode.</p></li>
        <li class="card"><h3>2. Apply</h3><p class="text-muted">Apply in one click with your saved profile and resume.</p></li>
        <li class="card"><h3>3. Track your application</h3><p class="text-muted">See every status change from Applied to Selected.</p></li>
      </ol>
    </section>

    <section class="container section cta">
      <div class="card"><h3>Looking for a job?</h3><p class="text-muted">Create a profile once and apply to as many jobs as you like.</p>
        <a mat-flat-button routerLink="/register">Create job seeker account</a></div>
      <div class="card"><h3>Hiring?</h3><p class="text-muted">Post openings and manage applicants from one dashboard.</p>
        <a mat-flat-button routerLink="/register">Create recruiter account</a></div>
    </section>
  `,
  styles: `
    .hero { background: var(--jh-ink); color: #fff; padding: 72px 0 96px; }
    .hero__inner { max-width: 900px; }
    .hero p { color: #c9d6d9; font-size: 1.1rem; max-width: 56ch; }
    .search { display: grid; grid-template-columns: 1.6fr 1fr auto; gap: 12px; align-items: center; margin-top: 32px; padding: 16px; color: var(--jh-ink); }
    .search button { height: 56px; padding: 0 28px; }
    .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-top: -40px; position: relative; }
    .stats div { background: var(--jh-surface); border: 1px solid var(--jh-border); border-radius: var(--jh-radius); padding: 16px 20px; box-shadow: var(--jh-shadow); }
    .stats strong { display: block; font-size: 1.8rem; color: var(--jh-primary); line-height: 1.1; }
    .stats span { color: var(--jh-muted); font-size: 0.9rem; }
    .head { justify-content: space-between; margin-bottom: 8px; }
    .cats { grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); }
    .cat { display: flex; gap: 14px; align-items: center; color: inherit; }
    .cat:hover { text-decoration: none; border-color: var(--jh-primary); }
    .cat mat-icon { color: var(--jh-primary); }
    .cat h3 { margin: 0; font-size: 1rem; color: var(--jh-ink); }
    .steps { list-style: none; padding: 0; margin: 0; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); }
    .steps h3 { margin-bottom: 6px; }
    .cta { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
    @media (max-width: 760px) {
      .search { grid-template-columns: 1fr; }
      .stats { grid-template-columns: 1fr 1fr; }
      .cta { grid-template-columns: 1fr; }
    }
  `,
})
export class HomeComponent {
  private router = inject(Router);
  private jobService = inject(JobService);
  private companyService = inject(CompanyService);

  locations = LOCATIONS;
  form = inject(FormBuilder).nonNullable.group({ keyword: [''], location: [''] });

  stats = toSignal(this.jobService.getStats());
  categories = toSignal(this.jobService.getCategories(), { initialValue: [] });
  latest = toSignal(this.jobService.getJobs({ limit: 6 }));
  companies = toSignal(this.companyService.getCompanies(), { initialValue: [] });

  search(): void {
    const { keyword, location } = this.form.getRawValue();
    this.router.navigate(['/jobs'], { queryParams: { keyword: keyword || null, location: location || null } });
  }
}
