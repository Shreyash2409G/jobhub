import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { switchMap } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { AdminCompany } from '../../core/models';
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
  selector: 'app-admin-companies',
  imports: [RouterLink, MatButtonModule, TableToolbarComponent, PaginationComponent, LoadingComponent, EmptyStateComponent],
  template: `
    <h1>Companies</h1>
    <app-table-toolbar placeholder="Search company, industry or recruiter email" [term]="list.term()" filterLabel="Status"
      [options]="statuses" [filter]="list.filter()" (search)="list.setTerm($event)" (filterChange)="list.setFilter($event)" />

    @if (list.loading()) {
      <app-loading message="Loading companies…" />
    } @else if (list.items().length) {
      <div class="card table-wrap">
        <table class="jh">
          <thead><tr><th>Company</th><th>Recruiter</th><th>Open jobs</th><th>Status</th><th></th></tr></thead>
          <tbody>
            @for (c of list.items(); track c.id) {
              <tr>
                <td>
                  @if (c.isDeleted) { <strong>{{ c.name }}</strong> } @else { <a [routerLink]="['/companies', c.id]"><strong>{{ c.name }}</strong></a> }
                  <br><span class="text-muted">{{ c.industry }} · {{ c.location }}</span>
                </td>
                <td>{{ c.recruiterName }}<br><span class="text-muted">{{ c.recruiterEmail }}</span></td>
                <td>{{ c.openJobs }}</td>
                <td><span class="pill" [class]="c.isDeleted ? 'removed' : 'active'">{{ c.isDeleted ? 'Removed' : 'Active' }}</span></td>
                <td><button mat-button type="button" (click)="toggle(c)">{{ c.isDeleted ? 'Restore' : 'Remove' }}</button></td>
              </tr>
            }
          </tbody>
        </table>
      </div>
      <app-pagination [page]="list.page()" [total]="list.total()" [pageSize]="list.pageSize" (pageChange)="list.setPage($event)" />
    } @else {
      <div class="card"><app-empty-state title="No companies found" message="Try a different search or status." /></div>
    }
  `,
})
export class AdminCompaniesComponent {
  private admin = inject(AdminService);
  private confirm = inject(ConfirmService);
  private toast = inject(ToastService);

  statuses: FilterOption[] = [{ value: '', label: 'All' }, { value: 'Active', label: 'Active' }, { value: 'Removed', label: 'Removed' }];
  list = createPagedList((query) => this.admin.companies(query));

  toggle(company: AdminCompany): void {
    const remove = !company.isDeleted;
    this.confirm
      .ask({
        title: remove ? 'Remove this company?' : 'Restore this company?',
        message: remove ? `${company.name} and all its jobs will disappear from JobHub. Applications are kept.` : `${company.name} and its jobs will be visible again.`,
        confirmText: remove ? 'Remove' : 'Restore',
      })
      .pipe(switchMap(() => this.admin.setCompanyRemoved(company.id, remove)))
      .subscribe({
        next: () => { this.toast.success(remove ? 'Company removed.' : 'Company restored.'); this.list.reload(); },
        error: (err) => this.toast.error(apiMessage(err)),
      });
  }
}
