import { DatePipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Observable, switchMap } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { AdminJob } from '../../core/models';
import { AdminService } from '../../core/services/admin.service';
import { ToastService } from '../../core/services/toast.service';
import { createPagedList } from '../../core/utils/paged-list';
import { apiMessage } from '../../core/utils/api-error';
import { EmptyStateComponent } from '../../shared/components/empty-state.component';
import { LoadingComponent } from '../../shared/components/loading.component';
import { PaginationComponent } from '../../shared/components/pagination.component';
import { FilterOption, TableToolbarComponent } from '../../shared/components/table-toolbar.component';
import { ConfirmService } from '../../shared/services/confirm.service';

@Component({
  selector: 'app-admin-jobs',
  imports: [DatePipe, RouterLink, MatButtonModule, TableToolbarComponent, PaginationComponent, LoadingComponent, EmptyStateComponent],
  template: `
    <h1>Jobs</h1>
    <app-table-toolbar placeholder="Search by job title or company" [term]="list.term()" filterLabel="Status"
      [options]="statuses" [filter]="list.filter()" (search)="list.setTerm($event)" (filterChange)="list.setFilter($event)" />

    @if (list.loading()) {
      <app-loading message="Loading jobs…" />
    } @else if (list.items().length) {
      <div class="card table-wrap">
        <table class="jh">
          <thead><tr><th>Job</th><th>Posted</th><th>Applicants</th><th>Reports</th><th>Status</th><th></th></tr></thead>
          <tbody>
            @for (j of list.items(); track j.id) {
              <tr>
                <td>
                  @if (j.isDeleted) { <strong>{{ j.title }}</strong> } @else { <a [routerLink]="['/jobs', j.id]"><strong>{{ j.title }}</strong></a> }
                  <br><span class="text-muted">{{ j.company.name }} · {{ j.location }}</span>
                </td>
                <td>{{ j.postedDate | date: 'd MMM y' }}</td>
                <td>{{ j.applicantCount }}</td>
                <td>@if (j.openReports) { <a routerLink="/admin/reports"><strong>{{ j.openReports }} open</strong></a> } @else { 0 }</td>
                <td><span class="pill" [class]="state(j).toLowerCase()">{{ state(j) }}</span></td>
                <td class="actions">
                  @if (!j.isDeleted) {
                    <button mat-button type="button" (click)="toggleOpen(j)">{{ j.status === 'Open' ? 'Close' : 'Reopen' }}</button>
                  }
                  <button mat-button type="button" (click)="toggleRemoved(j)">{{ j.isDeleted ? 'Restore' : 'Remove' }}</button>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
      <app-pagination [page]="list.page()" [total]="list.total()" [pageSize]="list.pageSize" (pageChange)="list.setPage($event)" />
    } @else {
      <div class="card"><app-empty-state title="No jobs found" message="Try a different search or status." /></div>
    }
  `,
  styles: `.actions { white-space: nowrap; }`,
})
export class AdminJobsComponent {
  private admin = inject(AdminService);
  private confirm = inject(ConfirmService);
  private toast = inject(ToastService);

  statuses: FilterOption[] = [
    { value: '', label: 'All' }, { value: 'Open', label: 'Open' }, { value: 'Closed', label: 'Closed' }, { value: 'Removed', label: 'Removed' },
  ];
  list = createPagedList((query) => this.admin.jobs(query));

  state(job: AdminJob): string { return job.isDeleted ? 'Removed' : job.status; }

  toggleOpen(job: AdminJob): void {
    const close = job.status === 'Open';
    this.change(
      job,
      { title: close ? 'Close this job?' : 'Reopen this job?', confirmText: close ? 'Close job' : 'Reopen',
        message: close ? 'Candidates can no longer apply. The recruiter is notified.' : 'The job becomes visible and open for applications again.' },
      { status: close ? 'Closed' : 'Open' }, close ? 'Job closed.' : 'Job reopened.'
    );
  }

  toggleRemoved(job: AdminJob): void {
    const remove = !job.isDeleted;
    this.change(
      job,
      { title: remove ? 'Remove this job?' : 'Restore this job?', confirmText: remove ? 'Remove' : 'Restore',
        message: remove ? 'It disappears from JobHub. Applications are kept. The recruiter is notified.' : 'The job becomes visible again.' },
      { isDeleted: remove }, remove ? 'Job removed.' : 'Job restored.'
    );
  }

  private change(job: AdminJob, dialog: { title: string; message: string; confirmText: string }, change: { status?: 'Open' | 'Closed'; isDeleted?: boolean }, done: string): void {
    this.confirm
      .ask(dialog)
      .pipe(switchMap((): Observable<unknown> => this.admin.updateJob(job.id, change)))
      .subscribe({
        next: () => { this.toast.success(done); this.list.reload(); },
        error: (err) => this.toast.error(apiMessage(err)), // e.g. reopening after the deadline
      });
  }
}
