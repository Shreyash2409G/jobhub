import { Component, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { AuthService } from './core/services/auth.service';
import { CandidateService } from './core/services/candidate.service';
import { RecruiterService } from './core/services/recruiter.service';
import { NavbarComponent } from './shared/components/navbar.component';
import { FooterComponent } from './shared/components/footer.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, NavbarComponent, FooterComponent],
  template: `
    <div class="shell">
      <app-navbar />
      <main><router-outlet /></main>
      <app-footer />
    </div>
  `,
  styles: `
    .shell { min-height: 100vh; display: flex; flex-direction: column; }
    main { flex: 1; }
  `,
})
export class AppComponent {
  constructor() {
    // Create the stores now so they start loading as soon as someone logs in (or is already logged in).
    inject(CandidateService);
    inject(RecruiterService);
    // If a token is stored, ask the API whether it is still valid.
    inject(AuthService).verifySession();

    // Scroll to top on page changes only. Query-param changes (filters, pagination) keep the scroll position.
    let lastPath = '';
    inject(Router).events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd), takeUntilDestroyed())
      .subscribe((e) => {
        const path = e.urlAfterRedirects.split('?')[0];
        if (path !== lastPath) window.scrollTo(0, 0);
        lastPath = path;
      });
  }
}
