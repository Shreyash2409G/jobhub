import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { CandidateService } from '../../core/services/candidate.service';
import { JobActionsService } from '../../core/services/job-actions.service';
import { JobCardComponent } from '../../shared/components/job-card.component';
import { EmptyStateComponent } from '../../shared/components/empty-state.component';

@Component({
  selector: 'app-saved-jobs',
  imports: [RouterLink, MatButtonModule, JobCardComponent, EmptyStateComponent],
  template: `
    <h1>Saved jobs</h1>
    @if (candidate.saved().length) {
      <div class="grid">
        @for (job of candidate.saved(); track job.id) {
          <div class="item">
            <app-job-card [job]="job" />
            <div class="row actions">
              @if (actions.hasApplied(job.id)) {
                <button mat-flat-button disabled>Applied</button>
              } @else if (actions.isClosed(job)) {
                <button mat-flat-button disabled>Closed</button>
              } @else {
                <button mat-flat-button (click)="actions.apply(job)">Apply</button>
              }
              <button mat-button (click)="actions.save(job)">Remove</button>
            </div>
          </div>
        }
      </div>
    } @else {
      <div class="card"><app-empty-state icon="bookmark_border" title="No saved jobs yet" message="Tap the bookmark on any job to keep it here.">
        <a mat-flat-button routerLink="/jobs">Browse jobs</a></app-empty-state></div>
    }
  `,
  styles: `.grid { grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); } .actions { margin-top: 10px; }`,
})
export class SavedJobsComponent {
  candidate = inject(CandidateService);
  actions = inject(JobActionsService);
}
