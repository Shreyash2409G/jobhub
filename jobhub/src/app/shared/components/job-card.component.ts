import { Component, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Job } from '../../core/models';
import { JobActionsService } from '../../core/services/job-actions.service';
import { CompanyLogoComponent } from './company-logo.component';
import { SalaryRangePipe } from '../pipes/salary-range.pipe';
import { TimeAgoPipe } from '../pipes/time-ago.pipe';

@Component({
  selector: 'app-job-card',
  imports: [RouterLink, MatButtonModule, MatIconModule, CompanyLogoComponent, SalaryRangePipe, TimeAgoPipe],
  template: `
    <article class="card job">
      <div class="job__head">
        <app-company-logo [name]="job().company.name" />
        <div class="job__title">
          <h3><a [routerLink]="['/jobs', job().id]">{{ job().title }}</a></h3>
          <a class="text-muted" [routerLink]="['/companies', job().company.id]">{{ job().company.name }}</a>
        </div>
        <button mat-icon-button (click)="actions.save(job())"
                [attr.aria-label]="actions.isSaved(job().id) ? 'Remove saved job' : 'Save job'">
          <mat-icon>{{ actions.isSaved(job().id) ? 'bookmark' : 'bookmark_border' }}</mat-icon>
        </button>
      </div>

      <div class="row chips">
        <span class="chip"><mat-icon>place</mat-icon>{{ job().location }}</span>
        <span class="chip">{{ job().jobType }}</span>
        <span class="chip">{{ job().workMode }}</span>
        <span class="chip">{{ job().experience }}</span>
      </div>

      <div class="job__skills text-muted">{{ skillList() }}</div>

      <div class="job__foot">
        <strong>{{ job() | salaryRange }}</strong>
        <span class="text-muted">{{ job().postedDate | timeAgo }}</span>
      </div>
    </article>
  `,
  styles: `
    .job { display: flex; flex-direction: column; gap: 14px; height: 100%; }
    .job__head { display: flex; align-items: center; gap: 12px; }
    .job__title { flex: 1; min-width: 0; }
    .job__title h3 { margin: 0; font-size: 1.05rem; }
    .job__title h3 a { color: var(--jh-ink); }
    .chips { gap: 8px; }
    .job__skills { font-size: 0.9rem; }
    .job__foot { margin-top: auto; display: flex; justify-content: space-between; align-items: center; }
  `,
})
export class JobCardComponent {
  job = input.required<Job>();
  actions = inject(JobActionsService);
  skillList = () => this.job().skills.slice(0, 4).map((s) => s.name).join(' · ');
}
