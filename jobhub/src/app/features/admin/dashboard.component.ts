import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatIconModule } from '@angular/material/icon';
import { AdminService } from '../../core/services/admin.service';
import { BarChartComponent, ChartItem } from '../../shared/components/bar-chart.component';
import { LoadingComponent } from '../../shared/components/loading.component';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const ROLE_LABELS: Record<string, string> = { candidate: 'Job seekers', recruiter: 'Recruiters', admin: 'Admins' };

@Component({
  selector: 'app-admin-dashboard',
  imports: [RouterLink, MatIconModule, BarChartComponent, LoadingComponent],
  template: `
    <h1>Platform overview</h1>
    @if (stats(); as s) {
      <div class="stat-grid">
        <a class="stat card" routerLink="/admin/users"><mat-icon>people</mat-icon><strong>{{ s.totals.users }}</strong><span>Total users</span></a>
        <a class="stat card" routerLink="/admin/recruiters"><mat-icon>badge</mat-icon><strong>{{ s.totals.recruiters }}</strong><span>Recruiters</span></a>
        <a class="stat card" routerLink="/admin/companies"><mat-icon>business</mat-icon><strong>{{ s.totals.companies }}</strong><span>Companies</span></a>
        <a class="stat card" routerLink="/admin/jobs"><mat-icon>work</mat-icon><strong>{{ s.totals.jobs }}</strong><span>Jobs</span></a>
        <div class="stat card"><mat-icon>description</mat-icon><strong>{{ s.totals.applications }}</strong><span>Applications</span></div>
      </div>

      @if (s.totals.openReports > 0) {
        <a class="alert card" routerLink="/admin/reports">
          <mat-icon>flag</mat-icon>
          <span><strong>{{ s.totals.openReports }}</strong> reported {{ s.totals.openReports === 1 ? 'job needs' : 'jobs need' }} review</span>
          <span class="go">Review</span>
        </a>
      }

      <div class="charts">
        <section class="card">
          <h3>Application funnel</h3>
          <p class="text-muted">How many applications passed through each stage. Rejected: {{ s.rejected }}.</p>
          <app-bar-chart [items]="funnel()" [showShare]="true" />
        </section>
        <section class="card">
          <h3>Jobs by category</h3>
          <p class="text-muted">Jobs on the platform, per category.</p>
          <app-bar-chart [items]="categories()" />
        </section>
        <section class="card wide">
          <h3>Applications in the last 14 days</h3>
          <app-bar-chart [items]="perDay()" orientation="vertical" />
        </section>
        <section class="card">
          <h3>Users by role</h3>
          <app-bar-chart [items]="roles()" />
        </section>
      </div>
    } @else {
      <app-loading message="Loading statistics…" />
    }
  `,
  styles: `
    .stat-grid { margin: 16px 0; }
    .stat { display: flex; flex-direction: column; color: inherit; }
    a.stat:hover { text-decoration: none; border-color: var(--jh-primary); }
    .stat mat-icon { color: var(--jh-primary); } .stat strong { font-size: 2rem; line-height: 1.1; margin-top: 8px; } .stat span { color: var(--jh-muted); }
    .alert { display: flex; align-items: center; gap: 12px; color: inherit; margin-bottom: 16px; background: #fff7e6; border-color: var(--jh-accent); }
    .alert:hover { text-decoration: none; } .alert mat-icon { color: #b97800; } .alert .go { margin-left: auto; font-weight: 700; color: var(--jh-primary); }
    .charts { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .charts .wide { grid-column: 1 / -1; }
    h3 { margin-bottom: 4px; } p { margin-bottom: 16px; }
    @media (max-width: 900px) { .charts { grid-template-columns: 1fr; } }
  `,
})
export class AdminDashboardComponent {
  stats = toSignal(inject(AdminService).getStats());

  funnel = computed<ChartItem[]>(() => (this.stats()?.funnel ?? []).map((f) => ({ label: f.status, value: f.count })));
  categories = computed<ChartItem[]>(() => (this.stats()?.jobsByCategory ?? []).map((c) => ({ label: c.name, value: c.count })));
  roles = computed<ChartItem[]>(() => (this.stats()?.usersByRole ?? []).map((r) => ({ label: ROLE_LABELS[r.role] ?? r.role, value: r.count })));
  perDay = computed<ChartItem[]>(() =>
    (this.stats()?.applicationsPerDay ?? []).map((d) => {
      const [, month, day] = d.date.split('-').map(Number);
      return { label: `${day} ${MONTHS[month - 1]}`, value: d.count };
    })
  );
}
