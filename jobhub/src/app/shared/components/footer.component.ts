import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-footer',
  imports: [RouterLink],
  template: `
    <footer class="footer">
      <div class="container footer__grid">
        <div>
          <a routerLink="/" class="brand">Job<span>Hub</span></a>
          <p>Connecting job seekers and recruiters across India.</p>
        </div>
        <div>
          <h4>Job seekers</h4>
          <a routerLink="/jobs">Browse jobs</a>
          <a routerLink="/companies">Browse companies</a>
          <a routerLink="/register">Create profile</a>
        </div>
        <div>
          <h4>Recruiters</h4>
          <a routerLink="/register">Post a job</a>
          <a routerLink="/login">Recruiter login</a>
        </div>
        <div>
          <h4>JobHub</h4>
          <a routerLink="/about">About</a>
          <a routerLink="/contact">Contact</a>
        </div>
      </div>
      <div class="container footer__bottom">&copy; {{ year }} JobHub. A portfolio project built with Angular.</div>
    </footer>
  `,
  styles: `
    .footer { background: var(--jh-ink); color: #c9d6d9; padding-top: 48px; }
    .footer__grid { display: grid; gap: 32px; grid-template-columns: 2fr 1fr 1fr 1fr; padding-bottom: 32px; }
    .footer h4 { color: #fff; font-size: 1rem; margin-bottom: 12px; }
    .footer a { display: block; color: #c9d6d9; padding: 3px 0; }
    .footer a:hover { color: #fff; }
    .footer .brand { font-size: 1.4rem; font-weight: 800; color: #fff; }
    .footer .brand span { color: var(--jh-accent); }
    .footer__bottom { border-top: 1px solid rgba(255,255,255,0.12); padding: 20px 16px; font-size: 0.875rem; }
    @media (max-width: 760px) { .footer__grid { grid-template-columns: 1fr 1fr; } }
  `,
})
export class FooterComponent {
  year = new Date().getFullYear();
}
