import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { ApplicationStatus } from '../../core/models';
import { CandidateService } from '../../core/services/candidate.service';
import { StatusBadgeComponent } from '../../shared/components/status-badge.component';
import { EmptyStateComponent } from '../../shared/components/empty-state.component';

const STATUSES: ApplicationStatus[] = ['Applied', 'Under Review', 'Shortlisted', 'Interview', 'Selected', 'Rejected'];

@Component({
  selector: 'app-applied-jobs',
  imports: [DatePipe, RouterLink, MatButtonModule, MatFormFieldModule, MatSelectModule, StatusBadgeComponent, EmptyStateComponent],
  template: `
    <div class="row head">
      <h1>Applied jobs</h1>
      <mat-form-field appearance="outline" subscriptSizing="dynamic" class="filter">
        <mat-label>Status</mat-label>
        <mat-select [value]="status()" (selectionChange)="status.set($event.value)">
          <mat-option value="All">All statuses</mat-option>
          @for (s of statuses; track s) { <mat-option [value]="s">{{ s }}</mat-option> }
        </mat-select>
      </mat-form-field>
    </div>

    @if (visible().length) {
      <div class="card table-wrap">
        <table class="jh">
          <thead><tr><th>Job</th><th>Company</th><th>Applied on</th><th>Status</th><th></th></tr></thead>
          <tbody>
            @for (app of visible(); track app.id) {
              <tr>
                <td><a [routerLink]="['/jobs', app.jobId]">{{ app.job?.title }}</a></td>
                <td>{{ app.job?.company?.name }}</td>
                <td>{{ app.appliedAt | date: 'd MMM y' }}</td>
                <td><app-status-badge [status]="app.status" /></td>
                <td><a mat-button [routerLink]="['/applications', app.id]">View details</a></td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    } @else if (candidate.applications().length) {
      <div class="card"><app-empty-state title="No applications with this status" message="Pick another status to see more." /></div>
    } @else {
      <div class="card"><app-empty-state icon="inbox" title="You have not applied to any job yet" message="Find a job you like and apply in one click.">
        <a mat-flat-button routerLink="/jobs">Browse jobs</a></app-empty-state></div>
    }
  `,
  styles: `.head { justify-content: space-between; margin-bottom: 8px; } .filter { width: 200px; }`,
})
export class AppliedJobsComponent {
  candidate = inject(CandidateService);
  statuses = STATUSES;
  status = signal<'All' | ApplicationStatus>('All');

  visible = computed(() =>
    this.candidate.applications()
      .filter((a) => this.status() === 'All' || a.status === this.status())
      .sort((a, b) => +new Date(b.appliedAt) - +new Date(a.appliedAt))
  );
}
