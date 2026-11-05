import { Component, inject } from '@angular/core';
import { switchMap } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { AdminUser } from '../../core/models';
import { AdminService } from '../../core/services/admin.service';
import { ToastService } from '../../core/services/toast.service';
import { createPagedList } from '../../core/utils/paged-list';
import { apiMessage } from '../../core/utils/api-error';
import { EmptyStateComponent } from '../../shared/components/empty-state.component';
import { LoadingComponent } from '../../shared/components/loading.component';
import { PaginationComponent } from '../../shared/components/pagination.component';
import { TableToolbarComponent } from '../../shared/components/table-toolbar.component';
import { ConfirmService } from '../../shared/services/confirm.service';

@Component({
  selector: 'app-admin-recruiters',
  imports: [MatButtonModule, TableToolbarComponent, PaginationComponent, LoadingComponent, EmptyStateComponent],
  template: `
    <h1>Recruiters</h1>
    <app-table-toolbar placeholder="Search by name or email" [term]="list.term()" (search)="list.setTerm($event)" />

    @if (list.loading()) {
      <app-loading message="Loading recruiters…" />
    } @else if (list.items().length) {
      <div class="card table-wrap">
        <table class="jh">
          <thead><tr><th>Recruiter</th><th>Company</th><th>Jobs</th><th>Status</th><th></th></tr></thead>
          <tbody>
            @for (u of list.items(); track u.id) {
              <tr>
                <td><strong>{{ u.name }}</strong><br><span class="text-muted">{{ u.email }}</span></td>
                <td>{{ u.companyName ?? 'No company yet' }}</td>
                <td>{{ u.jobCount ?? 0 }}</td>
                <td><span class="pill" [class]="u.isActive ? 'active' : 'deactivated'">{{ u.isActive ? 'Active' : 'Deactivated' }}</span></td>
                <td><button mat-button type="button" (click)="toggle(u)">{{ u.isActive ? 'Deactivate' : 'Activate' }}</button></td>
              </tr>
            }
          </tbody>
        </table>
      </div>
      <app-pagination [page]="list.page()" [total]="list.total()" [pageSize]="list.pageSize" (pageChange)="list.setPage($event)" />
    } @else {
      <div class="card"><app-empty-state title="No recruiters found" message="Try a different search." /></div>
    }
  `,
})
export class AdminRecruitersComponent {
  private admin = inject(AdminService);
  private confirm = inject(ConfirmService);
  private toast = inject(ToastService);

  list = createPagedList((query) => this.admin.users({ ...query, filter: 'recruiter' }));

  toggle(user: AdminUser): void {
    const deactivate = user.isActive;
    this.confirm
      .ask({
        title: deactivate ? 'Deactivate this recruiter?' : 'Activate this recruiter?',
        message: deactivate ? `${user.name} will no longer be able to log in or manage jobs.` : `${user.name} will be able to log in again.`,
        confirmText: deactivate ? 'Deactivate' : 'Activate',
      })
      .pipe(switchMap(() => this.admin.setUserActive(user.id, !user.isActive)))
      .subscribe({
        next: () => { this.toast.success(deactivate ? 'Recruiter deactivated.' : 'Recruiter activated.'); this.list.reload(); },
        error: (err) => this.toast.error(apiMessage(err)),
      });
  }
}
