import { DatePipe } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../core/services/auth.service';
import { RecruiterService } from '../../core/services/recruiter.service';
import { StatusBadgeComponent } from '../../shared/components/status-badge.component';
import { EmptyStateComponent } from '../../shared/components/empty-state.component';

@Component({
  selector: 'app-recruiter-dashboard',
  imports: [DatePipe, RouterLink, MatButtonModule, MatIconModule, StatusBadgeComponent, EmptyStateComponent],
  template: `
    <div class="stack">
      <div class="row head">
        <div>
          <h1>Welcome back, {{ firstName() }}</h1>
          <p class="text-muted">{{ recruiter.company()?.name ?? 'Set up your company to start hiring.' }}</p>
        </div>
        @if (recruiter.company()) { <a mat-flat-button routerLink="/recruiter/jobs/create"><mat-icon>add</mat-icon> Post a job</a> }
      </div>

      @if (!recruiter.company()) {
        <div class="card">
          <app-empty-state icon="business" title="Create your company profile" message="Candidates see your company next to every job you post.">
            <a mat-flat-button routerLink="/recruiter/company">Create company profile</a>
          </app-empty-state>
        </div>
      } @else {
        <div class="stat-grid">
          <a class="stat card" routerLink="/recruiter/jobs"><mat-icon>work</mat-icon><strong>{{ s().totalJobs }}</strong><span>Total jobs</span></a>
          <a class="stat card" routerLink="/recruiter/jobs"><mat-icon>check_circle</mat-icon><strong>{{ s().activeJobs }}</strong><span>Active jobs</span></a>
          <a class="stat card" routerLink="/recruiter/jobs"><mat-icon>groups</mat-icon><strong>{{ s().applications }}</strong><span>Applications</span></a>
          <div class="stat card"><mat-icon>star</mat-icon><strong>{{ s().shortlisted }}</strong><span>Shortlisted</span></div>
          <a class="stat card" routerLink="/recruiter/interviews"><mat-icon>event</mat-icon><strong>{{ s().interviews }}</strong><span>Interviews</span></a>
        </div>

        <section>
          <h2>Recent applicants</h2>
          @if (recent().length) {
            <div class="card list">
              @for (a of recent(); track a.id) {
                <a class="item" [routerLink]="['/recruiter/applicants', a.id]">
                  <div><strong>{{ a.candidate?.name }}</strong><span class="text-muted">{{ a.job?.title }} · {{ a.appliedAt | date: 'd MMM y' }}</span></div>
                  <app-status-badge [status]="a.status" />
                </a>
              }
            </div>
          } @else {
            <div class="card"><app-empty-state icon="inbox" title="No applicants yet" message="Applications to your jobs will show up here." /></div>
          }
        </section>
      }
    </div>
  `,
  styles: `
    .head { justify-content: space-between; }
    .stat { display: flex; flex-direction: column; color: inherit; }
    a.stat:hover { text-decoration: none; border-color: var(--jh-primary); }
    .stat mat-icon { color: var(--jh-primary); }
    .stat strong { font-size: 2rem; line-height: 1.1; margin-top: 8px; }
    .stat span { color: var(--jh-muted); }
    .list { padding: 0; }
    .item { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 14px 20px; color: inherit; border-bottom: 1px solid var(--jh-border); }
    .item:last-child { border-bottom: 0; }
    .item:hover { background: var(--jh-bg); text-decoration: none; }
    .item div { display: flex; flex-direction: column; }
  `,
})
export class RecruiterDashboardComponent {
  recruiter = inject(RecruiterService);
  private auth = inject(AuthService);

  s = this.recruiter.stats;
  firstName = computed(() => this.auth.user()?.name.split(' ')[0] ?? '');
  recent = computed(() => [...this.recruiter.applicants()].sort((a, b) => +new Date(b.appliedAt) - +new Date(a.appliedAt)).slice(0, 5));
}
