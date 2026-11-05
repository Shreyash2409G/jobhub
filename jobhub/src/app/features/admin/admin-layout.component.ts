import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-admin-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MatIconModule],
  template: `
    <div class="container layout">
      <nav class="side card" aria-label="Admin menu">
        @for (item of items; track item.path) {
          <a [routerLink]="item.path" routerLinkActive="active"><mat-icon>{{ item.icon }}</mat-icon><span>{{ item.label }}</span></a>
        }
      </nav>
      <section class="content"><router-outlet /></section>
    </div>
  `,
  styles: `
    .layout { display: grid; grid-template-columns: 230px 1fr; gap: 24px; padding-top: 24px; padding-bottom: 64px; align-items: start; }
    .side { position: sticky; top: 92px; display: flex; flex-direction: column; gap: 2px; padding: 10px; }
    .side a { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: var(--jh-radius-sm); color: var(--jh-muted); font-weight: 500; }
    .side a:hover { background: var(--jh-bg); text-decoration: none; }
    .side a.active { background: var(--jh-primary-soft); color: var(--jh-primary); }
    .content { min-width: 0; }
    @media (max-width: 860px) {
      .layout { grid-template-columns: 1fr; }
      .side { position: static; flex-direction: row; overflow-x: auto; }
      .side a { white-space: nowrap; }
    }
  `,
})
export class AdminLayoutComponent {
  items = [
    { path: '/admin/dashboard', label: 'Dashboard', icon: 'dashboard' },
    { path: '/admin/users', label: 'Users', icon: 'people' },
    { path: '/admin/recruiters', label: 'Recruiters', icon: 'badge' },
    { path: '/admin/companies', label: 'Companies', icon: 'business' },
    { path: '/admin/jobs', label: 'Jobs', icon: 'work' },
    { path: '/admin/categories', label: 'Categories', icon: 'category' },
    { path: '/admin/reports', label: 'Reports', icon: 'flag' },
  ];
}
