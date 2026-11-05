import { DatePipe } from '@angular/common';
import { Component, computed, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { APPLICATION_STATUS_FLOW, Application, ApplicationStatus } from '../../core/models';

interface Step { status: ApplicationStatus; at?: string; state: 'done' | 'current' | 'pending' | 'rejected'; }

@Component({
  selector: 'app-application-timeline',
  imports: [DatePipe, MatIconModule],
  template: `
    <ol class="timeline">
      @for (step of steps(); track step.status) {
        <li [class]="step.state">
          <span class="dot"><mat-icon>{{ icon(step.state) }}</mat-icon></span>
          <div>
            <strong>{{ step.status }}</strong>
            <span class="text-muted">{{ step.at ? (step.at | date: 'd MMM y, h:mm a') : 'Pending' }}</span>
          </div>
        </li>
      }
    </ol>
  `,
  styles: `
    .timeline { list-style: none; margin: 0; padding: 0; }
    li { position: relative; display: flex; gap: 14px; padding-bottom: 22px; }
    li:last-child { padding-bottom: 0; }
    li:not(:last-child)::before { content: ''; position: absolute; left: 15px; top: 32px; bottom: 0; width: 2px; background: var(--jh-border); }
    li.done:not(:last-child)::before { background: var(--jh-primary); }
    .dot { width: 32px; height: 32px; border-radius: 50%; display: grid; place-items: center; flex-shrink: 0;
           background: var(--jh-bg); border: 2px solid var(--jh-border); color: var(--jh-muted); }
    .dot mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .done .dot { background: var(--jh-primary); border-color: var(--jh-primary); color: #fff; }
    .current .dot { background: var(--jh-primary-soft); border-color: var(--jh-primary); color: var(--jh-primary); }
    .rejected .dot { background: var(--st-rejected-bg); border-color: var(--st-rejected); color: var(--st-rejected); }
    li div { display: flex; flex-direction: column; padding-top: 4px; }
    .pending strong { color: var(--jh-muted); font-weight: 500; }
  `,
})
export class ApplicationTimelineComponent {
  application = input.required<Application>();

  steps = computed<Step[]>(() => {
    const app = this.application();
    const reached: Step[] = app.history.map((h) => ({ status: h.status, at: h.at, state: 'done' }));
    const last = reached[reached.length - 1];
    if (app.status === 'Rejected') {
      last.state = 'rejected';
      return reached;
    }
    if (app.status === 'Selected') return reached;
    last.state = 'current';
    const remaining = APPLICATION_STATUS_FLOW.slice(APPLICATION_STATUS_FLOW.indexOf(app.status) + 1);
    return [...reached, ...remaining.map((status): Step => ({ status, state: 'pending' }))];
  });

  icon(state: Step['state']): string {
    return { done: 'check', current: 'schedule', pending: 'radio_button_unchecked', rejected: 'close' }[state];
  }
}
