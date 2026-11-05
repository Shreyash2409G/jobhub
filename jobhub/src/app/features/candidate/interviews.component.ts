import { DatePipe, NgTemplateOutlet } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { Interview } from '../../core/models';
import { CandidateService } from '../../core/services/candidate.service';
import { EmptyStateComponent } from '../../shared/components/empty-state.component';

@Component({
  selector: 'app-interviews',
  imports: [DatePipe, NgTemplateOutlet, RouterLink, MatIconModule, EmptyStateComponent],
  template: `
    <h1>Interviews</h1>
    <h2>Upcoming</h2>
    @if (upcoming().length) {
      <div class="stack">@for (i of upcoming(); track i.id) { <ng-container [ngTemplateOutlet]="row" [ngTemplateOutletContext]="{ $implicit: i }" /> }</div>
    } @else {
      <div class="card"><app-empty-state icon="event_available" title="No upcoming interviews" message="When a recruiter schedules one, it will show up here." /></div>
    }

    @if (past().length) {
      <h2 class="gap">Past interviews</h2>
      <div class="stack">@for (i of past(); track i.id) { <ng-container [ngTemplateOutlet]="row" [ngTemplateOutletContext]="{ $implicit: i }" /> }</div>
    }

    <ng-template #row let-i>
      <article class="card item">
        <div class="when">
          <strong>{{ i.scheduledAt | date: 'd MMM' }}</strong>
          <span>{{ i.scheduledAt | date: 'h:mm a' }}</span>
        </div>
        <div class="info">
          <h3><a [routerLink]="['/applications', i.applicationId]">{{ i.job?.title }}</a></h3>
          <span class="text-muted">{{ i.job?.company?.name }}</span>
          <span class="chip"><mat-icon>{{ i.mode === 'Online' ? 'videocam' : 'business' }}</mat-icon>{{ i.mode }}@if (i.location) { · {{ i.location }} }</span>
        </div>
        <span class="state" [class]="i.status.toLowerCase()">{{ i.status }}</span>
      </article>
    </ng-template>
  `,
  styles: `
    .gap { margin-top: 32px; }
    .item { display: flex; align-items: center; gap: 20px; flex-wrap: wrap; }
    .when { display: flex; flex-direction: column; align-items: center; min-width: 72px; padding: 8px 12px; background: var(--jh-primary-soft); border-radius: var(--jh-radius-sm); color: var(--jh-primary); }
    .when strong { font-size: 1.1rem; }
    .info { flex: 1; display: flex; flex-direction: column; gap: 4px; min-width: 200px; align-items: flex-start; }
    .info h3 { margin: 0; }
    .state { padding: 2px 12px; border-radius: 999px; font-size: 0.8rem; font-weight: 600; }
    .scheduled { background: var(--st-interview-bg); color: var(--st-interview); }
    .completed { background: var(--st-selected-bg); color: var(--st-selected); }
    .cancelled { background: var(--st-rejected-bg); color: var(--st-rejected); }
  `,
})
export class InterviewsComponent {
  private candidate = inject(CandidateService);
  upcoming = computed<Interview[]>(() => this.candidate.upcomingInterviews());
  past = computed<Interview[]>(() => {
    const upcomingIds = new Set(this.upcoming().map((i) => i.id));
    return this.candidate.interviews()
      .filter((i) => !upcomingIds.has(i.id))
      .sort((a, b) => +new Date(b.scheduledAt) - +new Date(a.scheduledAt));
  });
}
