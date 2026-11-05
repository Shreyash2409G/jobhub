import { DatePipe } from '@angular/common';
import { Component, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { filter, switchMap } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { JobService } from '../../core/services/job.service';
import { JobActionsService } from '../../core/services/job-actions.service';
import { CompanyLogoComponent } from '../../shared/components/company-logo.component';
import { JobCardComponent } from '../../shared/components/job-card.component';
import { LoadingComponent } from '../../shared/components/loading.component';
import { EmptyStateComponent } from '../../shared/components/empty-state.component';
import { SalaryRangePipe } from '../../shared/pipes/salary-range.pipe';
import { TimeAgoPipe } from '../../shared/pipes/time-ago.pipe';

@Component({
  selector: 'app-job-details',
  imports: [DatePipe, RouterLink, MatButtonModule, MatIconModule, CompanyLogoComponent, JobCardComponent,
    LoadingComponent, EmptyStateComponent, SalaryRangePipe, TimeAgoPipe],
  template: `
    <div class="container page">
      @if (job() === undefined) {
        <app-loading message="Loading job…" />
      } @else if (job() === null) {
        <div class="card"><app-empty-state icon="work_off" title="Job not found" message="This job may have been removed.">
          <a mat-flat-button routerLink="/jobs">Browse jobs</a></app-empty-state></div>
      } @else {
        @let j = job()!;
        <a routerLink="/jobs" class="back">← Back to jobs</a>

        <div class="card head">
          <app-company-logo [name]="j.company.name" [size]="64" />
          <div class="head__text">
            <h1>{{ j.title }}</h1>
            <a [routerLink]="['/companies', j.company.id]">{{ j.company.name }}</a>
            <div class="row chips">
              <span class="chip"><mat-icon>place</mat-icon>{{ j.location }}</span>
              <span class="chip">{{ j.jobType }}</span>
              <span class="chip">{{ j.workMode }}</span>
              <span class="chip">{{ j.experience }}</span>
              <span class="chip">{{ j | salaryRange }}</span>
            </div>
          </div>
        </div>

        <div class="layout">
          <div class="stack">
            <section class="card"><h2>About the role</h2><p>{{ j.description }}</p></section>
            <section class="card"><h2>Responsibilities</h2><ul>@for (r of j.responsibilities; track r) { <li>{{ r }}</li> }</ul></section>
            <section class="card"><h2>Requirements</h2><ul>@for (r of j.requirements; track r) { <li>{{ r }}</li> }</ul></section>
            <section class="card"><h2>Skills</h2><div class="row">@for (s of j.skills; track s.id) { <span class="chip">{{ s.name }}</span> }</div></section>
            <section class="card"><h2>Benefits</h2><ul>@for (b of j.benefits; track b) { <li>{{ b }}</li> }</ul></section>
          </div>

          <aside class="card side">
            @if (actions.isClosed(j)) {
              <button mat-flat-button disabled>Applications closed</button>
            } @else if (actions.hasApplied(j.id)) {
              <button mat-flat-button disabled>Applied</button>
            } @else {
              <button mat-flat-button (click)="actions.apply(j)">Apply now</button>
            }
            <button mat-stroked-button (click)="actions.save(j)">
              <mat-icon>{{ actions.isSaved(j.id) ? 'bookmark' : 'bookmark_border' }}</mat-icon>
              {{ actions.isSaved(j.id) ? 'Saved' : 'Save job' }}
            </button>
            <button mat-button type="button" class="report" (click)="actions.report(j)"><mat-icon>flag</mat-icon> Report this job</button>
            <dl>
              <dt>Posted</dt><dd>{{ j.postedDate | timeAgo }}</dd>
              <dt>Apply before</dt><dd>{{ j.applicationDeadline | date: 'd MMM y' }}</dd>
              <dt>Category</dt><dd>{{ j.category.name }}</dd>
            </dl>
          </aside>
        </div>

        @if (similar().length) {
          <h2 class="similar-title">Similar jobs</h2>
          <div class="grid">@for (s of similar(); track s.id) { <app-job-card [job]="s" /> }</div>
        }
      }
    </div>
  `,
  styles: `
    .page { padding-top: 24px; padding-bottom: 64px; }
    .back { display: inline-block; margin-bottom: 16px; }
    .head { display: flex; gap: 20px; align-items: flex-start; margin-bottom: 24px; }
    .head h1 { font-size: 1.8rem; margin-bottom: 4px; }
    .chips { gap: 8px; margin-top: 12px; }
    .layout { display: grid; grid-template-columns: 1fr 300px; gap: 24px; align-items: start; }
    .layout h2 { font-size: 1.15rem; }
    ul { margin: 0; padding-left: 20px; } li { margin-bottom: 6px; }
    .side { position: sticky; top: 92px; display: flex; flex-direction: column; gap: 12px; }
    dl { margin: 8px 0 0; } dt { color: var(--jh-muted); font-size: 0.85rem; margin-top: 12px; } dd { margin: 0; font-weight: 600; }
    .report { color: var(--jh-muted); }
    .similar-title { margin: 40px 0 16px; }
    @media (max-width: 860px) { .layout { grid-template-columns: 1fr; } .side { position: static; order: -1; } .head { flex-direction: column; } }
  `,
})
export class JobDetailsComponent {
  private jobService = inject(JobService);
  actions = inject(JobActionsService);

  id = input('');

  // undefined = loading, null = not found
  job = toSignal(toObservable(this.id).pipe(switchMap((id) => this.jobService.getJob(+id))), { initialValue: undefined });

  similar = toSignal(
    toObservable(this.job).pipe(
      filter((j): j is NonNullable<typeof j> => !!j),
      switchMap((j) => this.jobService.getSimilar(j))
    ),
    { initialValue: [] }
  );
}
