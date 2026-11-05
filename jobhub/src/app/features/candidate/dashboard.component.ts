import { DatePipe } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { switchMap } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { AuthService } from '../../core/services/auth.service';
import { CandidateService } from '../../core/services/candidate.service';
import { JobService } from '../../core/services/job.service';
import { JobCardComponent } from '../../shared/components/job-card.component';
import { StatusBadgeComponent } from '../../shared/components/status-badge.component';
import { EmptyStateComponent } from '../../shared/components/empty-state.component';

@Component({
  selector: 'app-dashboard',
  imports: [DatePipe, RouterLink, MatButtonModule, MatIconModule, MatProgressBarModule, JobCardComponent, StatusBadgeComponent, EmptyStateComponent],
  template: `
    <div class="stack">
      <div>
        <h1>Welcome back, {{ firstName() }}</h1>
        <p class="text-muted">Here is where your job search stands today.</p>
      </div>

      <div class="stat-grid">
        <a class="stat card" routerLink="/saved-jobs"><mat-icon>bookmark</mat-icon><strong>{{ candidate.saved().length }}</strong><span>Saved jobs</span></a>
        <a class="stat card" routerLink="/applied-jobs"><mat-icon>work</mat-icon><strong>{{ candidate.applications().length }}</strong><span>Applications</span></a>
        <a class="stat card" routerLink="/interviews"><mat-icon>event</mat-icon><strong>{{ candidate.upcomingInterviews().length }}</strong><span>Upcoming interviews</span></a>
      </div>

      <section class="card">
        <div class="row between">
          <h3>Profile completion: {{ candidate.completion().percent }}%</h3>
          @if (candidate.completion().percent < 100) { <a mat-stroked-button routerLink="/profile">Complete profile</a> }
        </div>
        <mat-progress-bar mode="determinate" [value]="candidate.completion().percent" />
        @if (candidate.completion().missing.length) {
          <p class="text-muted next">Next: {{ candidate.completion().missing[0] }}</p>
        }
      </section>

      <section>
        <h2>Recommended for you</h2>
        @if (recommended().length) {
          <div class="grid">@for (job of recommended(); track job.id) { <app-job-card [job]="job" /> }</div>
        } @else {
          <div class="card"><app-empty-state icon="work_outline" title="No recommendations yet" message="Add skills to your profile to see matching jobs." /></div>
        }
      </section>

      <section>
        <div class="row between"><h2>Recent applications</h2><a mat-button routerLink="/applied-jobs">View all</a></div>
        @if (recent().length) {
          <div class="card list">
            @for (app of recent(); track app.id) {
              <a class="item" [routerLink]="['/applications', app.id]">
                <div><strong>{{ app.job?.title }}</strong><span class="text-muted">{{ app.job?.company?.name }} · Applied {{ app.appliedAt | date: 'd MMM y' }}</span></div>
                <app-status-badge [status]="app.status" />
              </a>
            }
          </div>
        } @else {
          <div class="card"><app-empty-state icon="inbox" title="No applications yet" message="Apply to a job and track it here.">
            <a mat-flat-button routerLink="/jobs">Browse jobs</a></app-empty-state></div>
        }
      </section>
    </div>
  `,
  styles: `
    .between { justify-content: space-between; }
    .stat { display: flex; flex-direction: column; color: inherit; }
    .stat:hover { text-decoration: none; border-color: var(--jh-primary); }
    .stat mat-icon { color: var(--jh-primary); }
    .stat strong { font-size: 2rem; line-height: 1.1; margin-top: 8px; }
    .stat span { color: var(--jh-muted); }
    .next { margin: 12px 0 0; }
    .list { padding: 0; }
    .item { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 14px 20px; color: inherit; border-bottom: 1px solid var(--jh-border); }
    .item:last-child { border-bottom: 0; }
    .item:hover { background: var(--jh-bg); text-decoration: none; }
    .item div { display: flex; flex-direction: column; }
  `,
})
export class DashboardComponent {
  candidate = inject(CandidateService);
  private auth = inject(AuthService);
  private jobService = inject(JobService);

  firstName = computed(() => this.auth.user()?.name.split(' ')[0] ?? '');
  recent = computed(() => [...this.candidate.applications()].sort((a, b) => +new Date(b.appliedAt) - +new Date(a.appliedAt)).slice(0, 4));

  private skillNames = computed(() => this.candidate.profile().skills.map((s) => s.name));
  private recommendedAll = toSignal(
    toObservable(this.skillNames).pipe(switchMap((names) => this.jobService.getRecommended(names))),
    { initialValue: [] }
  );
  recommended = computed(() => this.recommendedAll().filter((j) => !this.candidate.hasApplied(j.id)).slice(0, 3));
}
