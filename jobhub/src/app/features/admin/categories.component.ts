import { Component, inject, signal } from '@angular/core';
import { switchMap } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { Category } from '../../core/models';
import { AdminService } from '../../core/services/admin.service';
import { JobService } from '../../core/services/job.service';
import { ToastService } from '../../core/services/toast.service';
import { apiMessage } from '../../core/utils/api-error';
import { EmptyStateComponent } from '../../shared/components/empty-state.component';
import { LoadingComponent } from '../../shared/components/loading.component';
import { ConfirmService } from '../../shared/services/confirm.service';
import { CategoryDialogComponent } from './category-dialog.component';

@Component({
  selector: 'app-admin-categories',
  imports: [MatButtonModule, MatIconModule, LoadingComponent, EmptyStateComponent],
  template: `
    <div class="row head">
      <h1>Job categories</h1>
      <button mat-flat-button type="button" (click)="add()"><mat-icon>add</mat-icon> Add category</button>
    </div>

    @if (loading()) {
      <app-loading message="Loading categories…" />
    } @else if (categories().length) {
      <div class="card table-wrap">
        <table class="jh">
          <thead><tr><th>Category</th><th>Icon</th><th>Open jobs</th><th></th></tr></thead>
          <tbody>
            @for (c of categories(); track c.id) {
              <tr>
                <td><strong>{{ c.name }}</strong></td>
                <td>@if (c.icon) { <mat-icon>{{ c.icon }}</mat-icon> <span class="text-muted">{{ c.icon }}</span> }</td>
                <td>{{ c.jobCount }}</td>
                <td class="actions">
                  <button mat-button type="button" (click)="edit(c)">Edit</button>
                  <button mat-button type="button" (click)="remove(c)">Delete</button>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    } @else {
      <div class="card"><app-empty-state title="No categories yet" message="Add the first one."><button mat-flat-button type="button" (click)="add()">Add category</button></app-empty-state></div>
    }
  `,
  styles: `.head { justify-content: space-between; margin-bottom: 8px; } .actions { white-space: nowrap; } td mat-icon { vertical-align: middle; margin-right: 6px; color: var(--jh-primary); }`,
})
export class AdminCategoriesComponent {
  private admin = inject(AdminService);
  private jobs = inject(JobService);
  private dialog = inject(MatDialog);
  private confirm = inject(ConfirmService);
  private toast = inject(ToastService);

  categories = signal<Category[]>([]);
  loading = signal(true);

  constructor() { this.load(); }

  add(): void {
    this.openDialog().pipe(switchMap((value) => this.admin.createCategory(value))).subscribe(this.done('Category added.'));
  }

  edit(category: Category): void {
    this.openDialog(category).pipe(switchMap((value) => this.admin.updateCategory(category.id, value))).subscribe(this.done('Category updated.'));
  }

  remove(category: Category): void {
    this.confirm
      .ask({ title: 'Delete this category?', message: `"${category.name}" will be deleted. A category that has jobs cannot be deleted.`, confirmText: 'Delete' })
      .pipe(switchMap(() => this.admin.deleteCategory(category.id)))
      .subscribe(this.done('Category deleted.'));
  }

  private openDialog(category?: Category) {
    return this.dialog
      .open<CategoryDialogComponent, { category?: Category }, { name: string; icon?: string }>(CategoryDialogComponent, { data: { category }, width: '440px', maxWidth: '94vw' })
      .afterClosed()
      .pipe(switchMap((value) => (value ? [value] : [])));
  }

  private done(message: string) {
    return {
      next: () => { this.toast.success(message); this.load(); },
      error: (err: unknown) => this.toast.error(apiMessage(err)), // e.g. "2 job(s) use this category..."
    };
  }

  private load(): void {
    this.loading.set(true);
    this.jobs.getCategories().subscribe({
      next: (list) => { this.categories.set(list); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }
}
