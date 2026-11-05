import { Component, computed, input } from '@angular/core';
import { ApplicationStatus } from '../../core/models';

@Component({
  selector: 'app-status-badge',
  template: `<span class="badge" [class]="cssClass()">{{ status() }}</span>`,
  styles: `
    .badge { display: inline-block; padding: 2px 12px; border-radius: 999px; font-size: 0.8rem; font-weight: 600; }
    .applied { color: var(--st-applied); background: var(--st-applied-bg); }
    .review { color: var(--st-review); background: var(--st-review-bg); }
    .shortlisted { color: var(--st-shortlisted); background: var(--st-shortlisted-bg); }
    .interview { color: var(--st-interview); background: var(--st-interview-bg); }
    .selected { color: var(--st-selected); background: var(--st-selected-bg); }
    .rejected { color: var(--st-rejected); background: var(--st-rejected-bg); }
  `,
})
export class StatusBadgeComponent {
  status = input.required<ApplicationStatus>();
  cssClass = computed(() => ({
    'Applied': 'applied', 'Under Review': 'review', 'Shortlisted': 'shortlisted',
    'Interview': 'interview', 'Selected': 'selected', 'Rejected': 'rejected',
  }[this.status()]));
}
