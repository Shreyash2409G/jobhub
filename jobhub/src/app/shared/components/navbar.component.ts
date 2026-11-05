import { Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/services/auth.service';
import { UserRole } from '../../core/models';

@Component({
  selector: 'app-navbar',
  imports: [RouterLink, RouterLinkActive, MatButtonModule, MatIconModule, MatMenuModule],
  template: `
    <header class="nav">
      <div class="container nav__bar">
        <a routerLink="/" class="brand" (click)="menuOpen.set(false)">Job<span>Hub</span></a>

        <nav class="nav__links" [class.open]="menuOpen()" aria-label="Main">
          @for (link of links; track link.path) {
            <a [routerLink]="link.path" routerLinkActive="active"
               [routerLinkActiveOptions]="{ exact: link.path === '/' }"
               (click)="menuOpen.set(false)">{{ link.label }}</a>
          }

          <div class="nav__auth">
            @if (auth.user(); as user) {
              <button mat-button [matMenuTriggerFor]="userMenu">
                <mat-icon>account_circle</mat-icon> {{ user.name }}
              </button>
              <mat-menu #userMenu="matMenu">
                <a mat-menu-item [routerLink]="auth.homeRoute(user.role)" (click)="menuOpen.set(false)">
                  <mat-icon>dashboard</mat-icon> Dashboard
                </a>
                <button mat-menu-item (click)="logout()"><mat-icon>logout</mat-icon> Logout</button>
              </mat-menu>
            } @else {
              <a mat-button routerLink="/login" (click)="menuOpen.set(false)">Login</a>
              <a mat-flat-button routerLink="/register" (click)="menuOpen.set(false)">Sign up</a>
              @if (showDemo) {
                <!-- Logs in with the demo accounts created by backend/seed.py (hidden on a deployed site) -->
                <button mat-button [matMenuTriggerFor]="demoMenu" class="dev">
                  <mat-icon>bug_report</mat-icon> Demo accounts
                </button>
                <mat-menu #demoMenu="matMenu">
                  <button mat-menu-item (click)="demo('candidate')">Enter as Job Seeker</button>
                  <button mat-menu-item (click)="demo('recruiter')">Enter as Recruiter</button>
                  <button mat-menu-item (click)="demo('admin')">Enter as Admin</button>
                </mat-menu>
              }
            }
          </div>
        </nav>

        <button mat-icon-button class="nav__toggle" (click)="menuOpen.set(!menuOpen())"
                [attr.aria-expanded]="menuOpen()" aria-label="Toggle menu">
          <mat-icon>{{ menuOpen() ? 'close' : 'menu' }}</mat-icon>
        </button>
      </div>
    </header>
  `,
  styles: `
    .nav { position: sticky; top: 0; z-index: 50; background: var(--jh-surface); border-bottom: 1px solid var(--jh-border); }
    .nav__bar { display: flex; align-items: center; justify-content: space-between; height: 68px; gap: 24px; }
    .brand { font-size: 1.5rem; font-weight: 800; color: var(--jh-ink); letter-spacing: -0.03em; }
    .brand span { color: var(--jh-primary); }
    .brand:hover { text-decoration: none; }
    .nav__links { display: flex; align-items: center; gap: 4px; flex: 1; }
    .nav__links > a { padding: 8px 14px; border-radius: 999px; color: var(--jh-muted); font-weight: 500; }
    .nav__links > a:hover { background: var(--jh-bg); text-decoration: none; }
    .nav__links > a.active { color: var(--jh-primary); background: var(--jh-primary-soft); }
    .nav__auth { margin-left: auto; display: flex; align-items: center; gap: 8px; }
    .dev { color: var(--jh-muted); }
    .nav__toggle { display: none; }

    @media (max-width: 860px) {
      .nav__toggle { display: inline-flex; }
      .nav__links {
        display: none; position: absolute; top: 68px; left: 0; right: 0;
        flex-direction: column; align-items: stretch; padding: 16px;
        background: var(--jh-surface); border-bottom: 1px solid var(--jh-border);
      }
      .nav__links.open { display: flex; }
      .nav__links > a { padding: 12px 14px; }
      .nav__auth { margin: 8px 0 0; flex-wrap: wrap; }
    }
  `,
})
export class NavbarComponent {
  auth = inject(AuthService);
  menuOpen = signal(false);
  showDemo = environment.showDemoAccounts;

  links = [
    { path: '/', label: 'Home' },
    { path: '/jobs', label: 'Jobs' },
    { path: '/companies', label: 'Companies' },
    { path: '/about', label: 'About' },
    { path: '/contact', label: 'Contact' },
  ];

  logout(): void { this.menuOpen.set(false); this.auth.logout(); }
  demo(role: UserRole): void { this.menuOpen.set(false); this.auth.demoLogin(role); }
}
