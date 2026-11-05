import { DatePipe, NgTemplateOutlet } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Interview } from '../../core/models';
import { RecruiterService } from '../../core/services/recruiter.service';
import { ToastService } from '../../core/services/toast.service';
import { apiMessage } from '../../core/utils/api-error';
import { EmptyStateComponent } from '../../shared/components/empty-state.component';

@Component({
  selector: 'app-recruiter-interviews',
  imports: [DatePipe, NgTemplateOutlet, RouterLink, MatButtonModule, MatIconModule, EmptyStateComponent],
  template: `
    <h1>Interviews</h1>
    <h2>Upcoming</h2>
    @if (upcoming().length) {
      <div class="stack">@for (i of upcoming(); track i.id) { <ng-container [ngTemplateOutlet]="row" [ngTemplateOutletContext]="{ $implicit: i, actions: true }" /> }</div>
    } @else {
      <div class="card"><app-empty-state icon="event_available" title="No upcoming interviews" message="Shortlist a candidate, then schedule an interview from the applicants page." /></div>
    }

    @if (past().length) {
      <h2 class="gap">Past and cancelled</h2>
      <div class="stack">@for (i of past(); track i.id) { <ng-container [ngTemplateOutlet]="row" [ngTemplateOutletContext]="{ $implicit: i, actions: false }" /> }</div>
    }

    <ng-template #row let-i let-actions="actions">
      <article class="card item">
        <div class="when"><strong>{{ i.scheduledAt | date: 'd MMM' }}</strong><span>{{ i.scheduledAt | date: 'h:mm a' }}</span></div>
        <div class="info">
          <h3><a [routerLink]="['/recruiter/applicants', i.applicationId]">{{ nameOf(i) }}</a></h3>
          <span class="text-muted">{{ i.job?.title }}</span>
          <span class="chip"><mat-icon>{{ i.mode === 'Online' ? 'videocam' : 'business' }}</mat-icon>{{ i.mode }}@if (i.location) { · {{ i.location }} }</span>
        </div>
        <span class="pill" [class]="i.status.toLowerCase()">{{ i.status }}</span>
        @if (actions) {
          <button mat-stroked-button type="button" (click)="complete(i)">Mark completed</button>
          <button mat-button type="button" (click)="cancel(i)">Cancel</button>
        }
      </article>
    </ng-template>
  `,
  styles: `
    .gap { margin-top: 32px; }
    .item { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
    .when { display: flex; flex-direction: column; align-items: center; min-width: 72px; padding: 8px 12px; background: var(--jh-primary-soft); border-radius: var(--jh-radius-sm); color: var(--jh-primary); }
    .when strong { font-size: 1.1rem; }
    .info { flex: 1; display: flex; flex-direction: column; gap: 4px; min-width: 200px; align-items: flex-start; } .info h3 { margin: 0; }
  `,
})
export class RecruiterInterviewsComponent {
  private recruiter = inject(RecruiterService);
  private toast = inject(ToastService);

  upcoming = computed<Interview[]>(() =>
    this.recruiter.interviews().filter((i) => i.status === 'Scheduled').sort((a, b) => +new Date(a.scheduledAt) - +new Date(b.scheduledAt))
  );
  past = computed<Interview[]>(() =>
    this.recruiter.interviews().filter((i) => i.status !== 'Scheduled').sort((a, b) => +new Date(b.scheduledAt) - +new Date(a.scheduledAt))
  );

  nameOf(i: Interview): string {
    return i.candidateName ?? this.recruiter.getApplicant(i.applicationId)?.candidate?.name ?? 'Candidate';
  }

  complete(i: Interview): void {
    this.recruiter.setInterviewStatus(i.id, 'Completed').subscribe({
      next: () => this.toast.success('Interview marked as completed.'),
      error: (err) => this.toast.error(apiMessage(err)),
    });
  }
  cancel(i: Interview): void {
    this.recruiter.setInterviewStatus(i.id, 'Cancelled').subscribe({
      next: () => this.toast.info('Interview cancelled. The candidate has been notified.'),
      error: (err) => this.toast.error(apiMessage(err)),
    });
  }
}
