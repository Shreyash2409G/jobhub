import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { Company } from '../../core/models';
import { CompanyLogoComponent } from './company-logo.component';

@Component({
  selector: 'app-company-card',
  imports: [RouterLink, MatIconModule, CompanyLogoComponent],
  template: `
    <a class="card company" [routerLink]="['/companies', company().id]">
      <app-company-logo [name]="company().name" [size]="56" />
      <div>
        <h3>{{ company().name }}</h3>
        <p class="text-muted">{{ company().industry }}</p>
        <span class="chip"><mat-icon>place</mat-icon>{{ company().location }}</span>
        @if (company().openJobs !== undefined) {
          <span class="open">{{ company().openJobs }} open {{ company().openJobs === 1 ? 'job' : 'jobs' }}</span>
        }
      </div>
    </a>
  `,
  styles: `
    .company { display: flex; gap: 16px; align-items: flex-start; color: inherit; height: 100%; }
    .company:hover { text-decoration: none; border-color: var(--jh-primary); }
    h3 { margin: 0 0 4px; color: var(--jh-ink); }
    p { margin: 0 0 10px; font-size: 0.9rem; }
    .open { margin-left: 10px; font-size: 0.875rem; font-weight: 600; color: var(--jh-primary); }
  `,
})
export class CompanyCardComponent {
  company = input.required<Company>();
}
