import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { RecruiterService } from '../../core/services/recruiter.service';
import { LoadingComponent } from '../../shared/components/loading.component';

@Component({
  selector: 'app-recruiter-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MatIconModule, LoadingComponent],
  template: `
    <div class="container layout">
      <nav class="side card" aria-label="Recruiter menu">
        @for (item of items; track item.path) {
          <a [routerLink]="item.path" routerLinkActive="active">
            <mat-icon>{{ item.icon }}</mat-icon><span>{{ item.label }}</span>
            @if (item.path === '/recruiter/notifications' && recruiter.unreadCount() > 0) { <em>{{ recruiter.unreadCount() }}</em> }
          </a>
        }
      </nav>
      <section class="content">
        @if (recruiter.ready()) { <router-outlet /> } @else { <app-loading message="Loading your data…" /> }
      </section>
    </div>
  `,
  styles: `
    .layout { display: grid; grid-template-columns: 230px 1fr; gap: 24px; padding-top: 24px; padding-bottom: 64px; align-items: start; }
    .side { position: sticky; top: 92px; display: flex; flex-direction: column; gap: 2px; padding: 10px; }
    .side a { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: var(--jh-radius-sm); color: var(--jh-muted); font-weight: 500; }
    .side a:hover { background: var(--jh-bg); text-decoration: none; }
    .side a.active { background: var(--jh-primary-soft); color: var(--jh-primary); }
    .side em { margin-left: auto; font-style: normal; font-size: 0.75rem; font-weight: 700; background: var(--jh-accent); color: var(--jh-ink); border-radius: 999px; padding: 0 8px; }
    .content { min-width: 0; }
    @media (max-width: 860px) {
      .layout { grid-template-columns: 1fr; }
      .side { position: static; flex-direction: row; overflow-x: auto; }
      .side a { white-space: nowrap; }
    }
  `,
})
export class RecruiterLayoutComponent {
  recruiter = inject(RecruiterService);
  items = [
    { path: '/recruiter/dashboard', label: 'Dashboard', icon: 'dashboard' },
    { path: '/recruiter/company', label: 'Company profile', icon: 'business' },
    { path: '/recruiter/jobs', label: 'My jobs', icon: 'work' },
    { path: '/recruiter/jobs/create', label: 'Post a job', icon: 'add_circle' },
    { path: '/recruiter/interviews', label: 'Interviews', icon: 'event' },
    { path: '/recruiter/notifications', label: 'Notifications', icon: 'notifications' },
  ];
}
