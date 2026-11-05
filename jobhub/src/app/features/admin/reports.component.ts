import { DatePipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Observable, switchMap } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { JobReport } from '../../core/models';
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
  selector: 'app-admin-reports',
  imports: [DatePipe, RouterLink, MatButtonModule, TableToolbarComponent, PaginationComponent, LoadingComponent, EmptyStateComponent],
  template: `
    <h1>Reported jobs</h1>
    <app-table-toolbar filterLabel="Status" [options]="statuses" [filter]="list.filter()" (filterChange)="list.setFilter($event)" />

    @if (list.loading()) {
      <app-loading message="Loading reports…" />
    } @else if (list.items().length) {
      <div class="card table-wrap">
        <table class="jh">
          <thead><tr><th>Job</th><th>Reason</th><th>Reported by</th><th>Status</th><th></th></tr></thead>
          <tbody>
            @for (r of list.items(); track r.id) {
              <tr>
                <td>
                  @if (r.jobRemoved) { <strong>{{ r.jobTitle }}</strong> } @else { <a [routerLink]="['/jobs', r.jobId]"><strong>{{ r.jobTitle }}</strong></a> }
                  <br><span class="text-muted">{{ r.companyName }} · {{ r.jobRemoved ? 'Removed' : r.jobStatus }}</span>
                </td>
                <td class="reason">{{ r.reason }}</td>
                <td>{{ r.reporterName }}<br><span class="text-muted">{{ r.createdAt | date: 'd MMM y' }}</span></td>
                <td><span class="pill" [class]="r.status.toLowerCase()">{{ r.status }}</span></td>
                <td class="actions">
                  @if (r.status === 'Open') {
                    <button mat-button type="button" (click)="closeAndResolve(r)">Close job</button>
                    <button mat-button type="button" (click)="review(r, 'Resolved')">Resolve</button>
                    <button mat-button type="button" (click)="review(r, 'Dismissed')">Dismiss</button>
                  }
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
      <app-pagination [page]="list.page()" [total]="list.total()" [pageSize]="list.pageSize" (pageChange)="list.setPage($event)" />
    } @else {
      <div class="card"><app-empty-state icon="flag" title="No reports here" message="Reports from job seekers will show up in this list." /></div>
    }
  `,
  styles: `.reason { max-width: 320px; } .actions { white-space: nowrap; }`,
})
export class AdminReportsComponent {
  private admin = inject(AdminService);
  private confirm = inject(ConfirmService);
  private toast = inject(ToastService);

  statuses: FilterOption[] = [
    { value: '', label: 'All' }, { value: 'Open', label: 'Open' }, { value: 'Resolved', label: 'Resolved' }, { value: 'Dismissed', label: 'Dismissed' },
  ];
  list = createPagedList((query) => this.admin.reports(query), 8, 'Open'); // starts on the reports that need a decision

  closeAndResolve(report: JobReport): void {
    this.confirm
      .ask({ title: 'Close this job?', message: `"${report.jobTitle}" will be closed and the report marked as resolved. The recruiter is notified.`, confirmText: 'Close job' })
      .pipe(switchMap((): Observable<unknown> => this.admin.reviewReport(report.id, 'Resolved', true)))
      .subscribe(this.done('Job closed and report resolved.'));
  }

  review(report: JobReport, status: 'Resolved' | 'Dismissed'): void {
    this.admin.reviewReport(report.id, status).subscribe(this.done(status === 'Resolved' ? 'Report resolved.' : 'Report dismissed.'));
  }

  private done(message: string) {
    return {
      next: () => { this.toast.success(message); this.list.reload(); },
      error: (err: unknown) => this.toast.error(apiMessage(err)),
    };
  }
}
