import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { Job } from '../../core/models';
import { RecruiterService } from '../../core/services/recruiter.service';
import { ToastService } from '../../core/services/toast.service';
import { apiMessage } from '../../core/utils/api-error';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog.component';
import { EmptyStateComponent } from '../../shared/components/empty-state.component';

@Component({
  selector: 'app-my-jobs',
  imports: [DatePipe, RouterLink, MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule, MatSelectModule, EmptyStateComponent],
  template: `
    <div class="row head">
      <h1>My jobs</h1>
      <a mat-flat-button routerLink="/recruiter/jobs/create"><mat-icon>add</mat-icon> Post a job</a>
    </div>

    @if (!recruiter.company()) {
      <div class="card"><app-empty-state icon="business" title="Create your company profile first" message="You need a company before you can post jobs.">
        <a mat-flat-button routerLink="/recruiter/company">Create company profile</a></app-empty-state></div>
    } @else if (!recruiter.jobs().length) {
      <div class="card"><app-empty-state icon="work_outline" title="You have not posted any jobs" message="Post your first job to start receiving applications.">
        <a mat-flat-button routerLink="/recruiter/jobs/create">Post a job</a></app-empty-state></div>
    } @else {
      <div class="row filters">
        <mat-form-field appearance="outline" subscriptSizing="dynamic" class="grow">
          <mat-label>Search by title</mat-label>
          <mat-icon matPrefix>search</mat-icon>
          <input matInput [value]="term()" (input)="term.set($any($event.target).value)">
        </mat-form-field>
        <mat-form-field appearance="outline" subscriptSizing="dynamic" class="status">
          <mat-label>Status</mat-label>
          <mat-select [value]="status()" (selectionChange)="status.set($event.value)">
            <mat-option value="All">All</mat-option><mat-option value="Open">Open</mat-option><mat-option value="Closed">Closed</mat-option>
          </mat-select>
        </mat-form-field>
      </div>

      @if (visible().length) {
        <div class="card table-wrap">
          <table class="jh">
            <thead><tr><th>Job</th><th>Status</th><th>Posted</th><th>Deadline</th><th>Applicants</th><th>Actions</th></tr></thead>
            <tbody>
              @for (job of visible(); track job.id) {
                <tr>
                  <td><a [routerLink]="['/jobs', job.id]"><strong>{{ job.title }}</strong></a><br><span class="text-muted">{{ job.location }} · {{ job.jobType }}</span></td>
                  <td><span class="pill" [class]="job.status.toLowerCase()">{{ job.status }}</span></td>
                  <td>{{ job.postedDate | date: 'd MMM y' }}</td>
                  <td>{{ job.applicationDeadline | date: 'd MMM y' }}</td>
                  <td><a [routerLink]="['/recruiter/jobs', job.id, 'applicants']">{{ recruiter.applicantsFor(job.id).length }}</a></td>
                  <td class="actions">
                    <a mat-icon-button [routerLink]="['/recruiter/jobs', job.id, 'edit']" aria-label="Edit job" title="Edit"><mat-icon>edit</mat-icon></a>
                    <a mat-icon-button [routerLink]="['/recruiter/jobs', job.id, 'applicants']" aria-label="View applicants" title="Applicants"><mat-icon>groups</mat-icon></a>
                    @if (job.status === 'Open') {
                      <button mat-icon-button (click)="close(job)" aria-label="Close job" title="Close job"><mat-icon>lock</mat-icon></button>
                    } @else {
                      <button mat-icon-button (click)="reopen(job)" aria-label="Reopen job" title="Reopen job"><mat-icon>lock_open</mat-icon></button>
                    }
                    <button mat-icon-button (click)="remove(job)" aria-label="Delete job" title="Delete"><mat-icon>delete</mat-icon></button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      } @else {
        <div class="card"><app-empty-state title="No jobs match" message="Try a different search or status." /></div>
      }
    }
  `,
  styles: `
    .head { justify-content: space-between; }
    .filters { margin-bottom: 16px; } .grow { flex: 1; min-width: 220px; } .status { width: 160px; }
    .actions { white-space: nowrap; }
  `,
})
export class MyJobsComponent {
  recruiter = inject(RecruiterService);
  private dialog = inject(MatDialog);
  private toast = inject(ToastService);

  term = signal('');
  status = signal<'All' | 'Open' | 'Closed'>('All');
  visible = computed(() => {
    const t = this.term().trim().toLowerCase();
    return this.recruiter.jobs().filter((j) => (this.status() === 'All' || j.status === this.status()) && (!t || j.title.toLowerCase().includes(t)));
  });

  close(job: Job): void {
    this.confirm('Close this job?', 'It will disappear from search and candidates can no longer apply.', 'Close job', () => {
      this.recruiter.setJobStatus(job.id, 'Closed').subscribe({
        next: () => this.toast.success('Job closed.'),
        error: (err) => this.toast.error(apiMessage(err)),
      });
    });
  }

  reopen(job: Job): void {
    if (new Date(job.applicationDeadline) < new Date()) {
      return this.toast.error('The deadline has passed. Edit the job and set a new deadline first.');
    }
    this.recruiter.setJobStatus(job.id, 'Open').subscribe({
      next: () => this.toast.success('Job reopened.'),
      error: (err) => this.toast.error(apiMessage(err)),
    });
  }

  remove(job: Job): void {
    this.confirm('Delete this job?', 'Existing applications are kept for your records, but the job is removed from JobHub.', 'Delete', () => {
      this.recruiter.deleteJob(job.id).subscribe({
        next: () => this.toast.success('Job deleted.'),
        error: (err) => this.toast.error(apiMessage(err)),
      });
    });
  }

  private confirm(title: string, message: string, confirmText: string, action: () => void): void {
    this.dialog.open(ConfirmDialogComponent, { data: { title, message, confirmText }, width: '420px', maxWidth: '92vw' })
      .afterClosed().subscribe((ok) => ok && action());
  }
}
