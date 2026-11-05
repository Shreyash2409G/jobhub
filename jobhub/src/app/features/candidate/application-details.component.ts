import { DatePipe } from '@angular/common';
import { Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { CandidateService } from '../../core/services/candidate.service';
import { ApplicationTimelineComponent } from '../../shared/components/application-timeline.component';
import { CompanyLogoComponent } from '../../shared/components/company-logo.component';
import { EmptyStateComponent } from '../../shared/components/empty-state.component';
import { StatusBadgeComponent } from '../../shared/components/status-badge.component';
import { SalaryRangePipe } from '../../shared/pipes/salary-range.pipe';

@Component({
  selector: 'app-application-details',
  imports: [DatePipe, RouterLink, MatButtonModule, ApplicationTimelineComponent, CompanyLogoComponent, EmptyStateComponent, StatusBadgeComponent, SalaryRangePipe],
  template: `
    <a routerLink="/applied-jobs">← Back to applied jobs</a>
    @if (app(); as a) {
      <div class="stack top">
        <section class="card head">
          <app-company-logo [name]="a.job!.company.name" [size]="56" />
          <div class="info">
            <h1>{{ a.job!.title }}</h1>
            <span class="text-muted">{{ a.job!.company.name }} · {{ a.job!.location }} · {{ a.job! | salaryRange }}</span>
          </div>
          <app-status-badge [status]="a.status" />
        </section>

        <div class="cols">
          <section class="card">
            <h3>Application progress</h3>
            <app-application-timeline [application]="a" />
          </section>

          <aside class="stack">
            <section class="card">
              <h3>Details</h3>
              <dl>
                <dt>Applied on</dt><dd>{{ a.appliedAt | date: 'd MMM y, h:mm a' }}</dd>
                <dt>Last updated</dt><dd>{{ a.updatedAt | date: 'd MMM y, h:mm a' }}</dd>
                <dt>Application ID</dt><dd>#{{ a.id }}</dd>
              </dl>
              <a mat-stroked-button [routerLink]="['/jobs', a.jobId]">View job posting</a>
            </section>
            @if (interview(); as i) {
              <section class="card">
                <h3>Interview</h3>
                <dl>
                  <dt>When</dt><dd>{{ i.scheduledAt | date: 'EEE, d MMM y, h:mm a' }}</dd>
                  <dt>Mode</dt><dd>{{ i.mode }}</dd>
                  @if (i.location) { <dt>Where</dt><dd>{{ i.location }}</dd> }
                  <dt>Status</dt><dd>{{ i.status }}</dd>
                </dl>
              </section>
            }
          </aside>
        </div>
      </div>
    } @else {
      <div class="card top"><app-empty-state icon="search_off" title="Application not found" message="It may belong to another account or no longer exist.">
        <a mat-flat-button routerLink="/applied-jobs">Back to applied jobs</a></app-empty-state></div>
    }
  `,
  styles: `
    .top { margin-top: 16px; }
    .head { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
    .info { flex: 1; min-width: 220px; } .info h1 { font-size: 1.5rem; margin-bottom: 2px; }
    .cols { display: grid; grid-template-columns: 1.2fr 1fr; gap: 16px; align-items: start; }
    dl { margin: 0 0 16px; } dt { color: var(--jh-muted); font-size: 0.85rem; margin-top: 10px; } dd { margin: 0; font-weight: 600; }
    @media (max-width: 860px) { .cols { grid-template-columns: 1fr; } }
  `,
})
export class ApplicationDetailsComponent {
  private candidate = inject(CandidateService);
  id = input('');

  app = computed(() => this.candidate.getApplication(+this.id()));
  interview = computed(() => this.candidate.interviews().find((i) => i.applicationId === this.app()?.id));
}
