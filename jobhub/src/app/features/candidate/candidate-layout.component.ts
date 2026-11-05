import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { CandidateService } from '../../core/services/candidate.service';
import { LoadingComponent } from '../../shared/components/loading.component';

@Component({
  selector: 'app-candidate-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MatIconModule, LoadingComponent],
  template: `
    <div class="container layout">
      <nav class="side card" aria-label="Job seeker menu">
        @for (item of items; track item.path) {
          <a [routerLink]="item.path" routerLinkActive="active">
            <mat-icon>{{ item.icon }}</mat-icon><span>{{ item.label }}</span>
            @if (item.path === '/notifications' && candidate.unreadCount() > 0) { <em>{{ candidate.unreadCount() }}</em> }
          </a>
        }
      </nav>
      <section class="content">
        @if (candidate.ready()) { <router-outlet /> } @else { <app-loading message="Loading your data…" /> }
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
export class CandidateLayoutComponent {
  candidate = inject(CandidateService);
  items = [
    { path: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
    { path: '/profile', label: 'My profile', icon: 'person' },
    { path: '/resume', label: 'My resume', icon: 'description' },
    { path: '/saved-jobs', label: 'Saved jobs', icon: 'bookmark' },
    { path: '/applied-jobs', label: 'Applied jobs', icon: 'work' },
    { path: '/interviews', label: 'Interviews', icon: 'event' },
    { path: '/notifications', label: 'Notifications', icon: 'notifications' },
    { path: '/settings', label: 'Settings', icon: 'settings' },
  ];
}
