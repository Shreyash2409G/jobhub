import { DatePipe } from '@angular/common';
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
import { FilterOption, TableToolbarComponent } from '../../shared/components/table-toolbar.component';
import { ConfirmService } from '../../shared/services/confirm.service';

@Component({
  selector: 'app-admin-users',
  imports: [DatePipe, MatButtonModule, TableToolbarComponent, PaginationComponent, LoadingComponent, EmptyStateComponent],
  template: `
    <h1>Users</h1>
    <app-table-toolbar placeholder="Search by name or email" [term]="list.term()" filterLabel="Role" [options]="roles"
      [filter]="list.filter()" (search)="list.setTerm($event)" (filterChange)="list.setFilter($event)" />

    @if (list.loading()) {
      <app-loading message="Loading users…" />
    } @else if (list.items().length) {
      <div class="card table-wrap">
        <table class="jh">
          <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Joined</th><th>Status</th><th></th></tr></thead>
          <tbody>
            @for (u of list.items(); track u.id) {
              <tr>
                <td><strong>{{ u.name }}</strong></td>
                <td>{{ u.email }}</td>
                <td><span class="pill" [class]="u.role">{{ u.role }}</span></td>
                <td>{{ u.createdAt | date: 'd MMM y' }}</td>
                <td><span class="pill" [class]="u.isActive ? 'active' : 'deactivated'">{{ u.isActive ? 'Active' : 'Deactivated' }}</span></td>
                <td>
                  @if (u.role !== 'admin') {
                    <button mat-button type="button" (click)="toggle(u)">{{ u.isActive ? 'Deactivate' : 'Activate' }}</button>
                  }
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
      <app-pagination [page]="list.page()" [total]="list.total()" [pageSize]="list.pageSize" (pageChange)="list.setPage($event)" />
    } @else {
      <div class="card"><app-empty-state title="No users found" message="Try a different search or role." /></div>
    }
  `,
})
export class AdminUsersComponent {
  private admin = inject(AdminService);
  private confirm = inject(ConfirmService);
  private toast = inject(ToastService);

  roles: FilterOption[] = [
    { value: '', label: 'All roles' }, { value: 'candidate', label: 'Job seekers' },
    { value: 'recruiter', label: 'Recruiters' }, { value: 'admin', label: 'Admins' },
  ];
  list = createPagedList((query) => this.admin.users(query));

  toggle(user: AdminUser): void {
    const deactivate = user.isActive;
    this.confirm
      .ask({
        title: deactivate ? 'Deactivate this account?' : 'Activate this account?',
        message: deactivate ? `${user.name} will no longer be able to log in.` : `${user.name} will be able to log in again.`,
        confirmText: deactivate ? 'Deactivate' : 'Activate',
      })
      .pipe(switchMap(() => this.admin.setUserActive(user.id, !user.isActive)))
      .subscribe({
        next: () => { this.toast.success(deactivate ? 'Account deactivated.' : 'Account activated.'); this.list.reload(); },
        error: (err) => this.toast.error(apiMessage(err)),
      });
  }
}
