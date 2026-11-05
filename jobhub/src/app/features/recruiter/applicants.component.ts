import { DatePipe } from '@angular/common';
import { Component, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatSelectModule } from '@angular/material/select';
import { ApplicationStatus } from '../../core/models';
import { RecruiterService } from '../../core/services/recruiter.service';
import { EmptyStateComponent } from '../../shared/components/empty-state.component';
import { StatusBadgeComponent } from '../../shared/components/status-badge.component';
import { ApplicantActions } from './applicant-actions.service';

const STATUSES: ApplicationStatus[] = ['Applied', 'Under Review', 'Shortlisted', 'Interview', 'Selected', 'Rejected'];

@Component({
  selector: 'app-applicants',
  imports: [DatePipe, RouterLink, MatButtonModule, MatFormFieldModule, MatIconModule, MatMenuModule, MatSelectModule, StatusBadgeComponent, EmptyStateComponent],
  template: `
    <a routerLink="/recruiter/jobs">← Back to my jobs</a>
    @if (job(); as j) {
      <div class="row head">
        <div><h1>Applicants</h1><p class="text-muted">{{ j.title }} · {{ j.location }}</p></div>
        <mat-form-field appearance="outline" subscriptSizing="dynamic" class="filter">
          <mat-label>Status</mat-label>
          <mat-select [value]="status()" (selectionChange)="status.set($event.value)">
            <mat-option value="All">All statuses</mat-option>
            @for (s of statuses; track s) { <mat-option [value]="s">{{ s }}</mat-option> }
          </mat-select>
        </mat-form-field>
      </div>

      @if (visible().length) {
        <div class="card table-wrap">
          <table class="jh">
            <thead><tr><th>Applicant</th><th>Skills</th><th>Resume</th><th>Applied</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              @for (a of visible(); track a.id) {
                <tr>
                  <td><a [routerLink]="['/recruiter/applicants', a.id]"><strong>{{ a.candidate?.name }}</strong></a><br><span class="text-muted">{{ a.candidate?.email }}</span></td>
                  <td>{{ skillList(a) }}</td>
                  <td>{{ a.candidate?.resumeName ?? 'Not uploaded' }}</td>
                  <td>{{ a.appliedAt | date: 'd MMM y' }}</td>
                  <td><app-status-badge [status]="a.status" /></td>
                  <td class="actions">
                    <a mat-button [routerLink]="['/recruiter/applicants', a.id]">View</a>
                    <button mat-icon-button [matMenuTriggerFor]="menu" aria-label="More actions"><mat-icon>more_vert</mat-icon></button>
                    <mat-menu #menu="matMenu">
                      @if (recruiter.canMoveTo(a, 'Under Review')) { <button mat-menu-item (click)="actions.review(a)">Mark under review</button> }
                      @if (recruiter.canMoveTo(a, 'Shortlisted')) { <button mat-menu-item (click)="actions.shortlist(a)">Shortlist</button> }
                      @if (recruiter.canSchedule(a)) { <button mat-menu-item (click)="actions.schedule(a)">Schedule interview</button> }
                      @if (recruiter.canMoveTo(a, 'Selected')) { <button mat-menu-item (click)="actions.select(a)">Select</button> }
                      @if (recruiter.canMoveTo(a, 'Rejected')) { <button mat-menu-item (click)="actions.reject(a)">Reject</button> }
                      @if (!hasActions(a)) { <button mat-menu-item disabled>No actions left</button> }
                    </mat-menu>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      } @else {
        <div class="card"><app-empty-state icon="groups" title="No applicants to show" message="Applications for this job will appear here." /></div>
      }
    } @else {
      <div class="card top"><app-empty-state icon="work_off" title="Job not found" message="It may have been deleted, or it belongs to another company.">
        <a mat-flat-button routerLink="/recruiter/jobs">Back to my jobs</a></app-empty-state></div>
    }
  `,
  styles: `
    .head { justify-content: space-between; margin: 12px 0; } .filter { width: 200px; } .top { margin-top: 16px; }
    .actions { white-space: nowrap; }
  `,
})
export class ApplicantsComponent {
  recruiter = inject(RecruiterService);
  actions = inject(ApplicantActions);

  id = input('');
  statuses = STATUSES;
  status = signal<'All' | ApplicationStatus>('All');

  job = computed(() => this.recruiter.getJob(+this.id()));
  visible = computed(() =>
    this.recruiter.applicantsFor(+this.id())
      .filter((a) => this.status() === 'All' || a.status === this.status())
      .sort((a, b) => +new Date(b.appliedAt) - +new Date(a.appliedAt))
  );

  skillList = (a: { candidate?: { skills: { name: string }[] } }) => a.candidate?.skills.slice(0, 4).map((s) => s.name).join(', ') ?? '';
  hasActions = (a: Parameters<RecruiterService['canSchedule']>[0]) =>
    this.recruiter.canSchedule(a) || (['Under Review', 'Shortlisted', 'Selected', 'Rejected'] as const).some((s) => this.recruiter.canMoveTo(a, s));
}
