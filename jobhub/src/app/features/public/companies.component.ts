import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { CompanyService } from '../../core/services/company.service';
import { CompanyCardComponent } from '../../shared/components/company-card.component';
import { LoadingComponent } from '../../shared/components/loading.component';
import { EmptyStateComponent } from '../../shared/components/empty-state.component';

@Component({
  selector: 'app-companies',
  imports: [MatFormFieldModule, MatIconModule, MatInputModule, CompanyCardComponent, LoadingComponent, EmptyStateComponent],
  template: `
    <div class="container">
      <div class="page-header"><h1>Companies hiring on JobHub</h1></div>
      <mat-form-field appearance="outline" class="filter">
        <mat-label>Search companies</mat-label>
        <mat-icon matPrefix>search</mat-icon>
        <input matInput [value]="term()" (input)="term.set($any($event.target).value)" placeholder="Name or industry">
      </mat-form-field>

      @if (companies() === null) {
        <app-loading message="Loading companies…" />
      } @else if (visible().length) {
        <div class="grid">@for (c of visible(); track c.id) { <app-company-card [company]="c" /> }</div>
      } @else {
        <div class="card"><app-empty-state title="No companies found" message="Try a different name or industry." /></div>
      }
    </div>
  `,
  styles: `.container { padding-bottom: 64px; } .filter { max-width: 420px; }`,
})
export class CompaniesComponent {
  companies = toSignal(inject(CompanyService).getCompanies(), { initialValue: null });
  term = signal('');
  visible = computed(() => {
    const t = this.term().trim().toLowerCase();
    return (this.companies() ?? []).filter((c) => !t || c.name.toLowerCase().includes(t) || c.industry.toLowerCase().includes(t));
  });
}
