import { DatePipe } from '@angular/common';
import { Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { RecruiterService } from '../../core/services/recruiter.service';
import { ResumeService } from '../../core/services/resume.service';
import { ApplicationTimelineComponent } from '../../shared/components/application-timeline.component';
import { EmptyStateComponent } from '../../shared/components/empty-state.component';
import { StatusBadgeComponent } from '../../shared/components/status-badge.component';
import { ApplicantActions } from './applicant-actions.service';

@Component({
  selector: 'app-applicant-details',
  imports: [DatePipe, RouterLink, MatButtonModule, ApplicationTimelineComponent, EmptyStateComponent, StatusBadgeComponent],
  template: `
    @if (app(); as a) {
      <a [routerLink]="['/recruiter/jobs', a.jobId, 'applicants']">← Back to applicants</a>
      <div class="cols top">
        <div class="stack">
          <section class="card">
            <div class="row between">
              <div><h1>{{ a.candidate?.name }}</h1><p class="text-muted">{{ a.candidate?.headline }}</p></div>
              <app-status-badge [status]="a.status" />
            </div>
            <dl>
              <dt>Email</dt><dd><a [href]="'mailto:' + a.candidate?.email">{{ a.candidate?.email }}</a></dd>
              @if (a.candidate?.phone) { <dt>Phone</dt><dd>{{ a.candidate?.phone }}</dd> }
              @if (a.candidate?.location) { <dt>Location</dt><dd>{{ a.candidate?.location }}</dd> }
              <dt>Applied for</dt><dd>{{ a.job?.title }} on {{ a.appliedAt | date: 'd MMM y' }}</dd>
              <dt>Resume</dt>
              <dd>
                {{ a.candidate?.resumeName ?? 'Not uploaded' }}
                @if (a.candidate?.resumeId) {
                  <button mat-stroked-button type="button" class="dl" (click)="resumes.download(a.candidate!.resumeId!, a.candidate!.resumeName ?? 'resume')">Download</button>
                }
              </dd>
            </dl>
          </section>

          @if (a.candidate?.about) { <section class="card"><h3>About</h3><p>{{ a.candidate?.about }}</p></section> }
          <section class="card"><h3>Skills</h3>
            <div class="row chips">@for (s of a.candidate?.skills; track s.id) { <span class="chip">{{ s.name }}</span> }</div></section>
          @if (a.candidate?.experience?.length) {
            <section class="card"><h3>Experience</h3>
              @for (e of a.candidate?.experience; track e.title + e.company) {
                <p><strong>{{ e.title }}</strong>, {{ e.company }}<br><span class="text-muted">{{ e.from }} to {{ e.to ?? 'Present' }}</span>
                  @if (e.description) { <br>{{ e.description }} }</p>
              }</section>
          }
          @if (a.candidate?.education?.length) {
            <section class="card"><h3>Education</h3>
              @for (e of a.candidate?.education; track e.degree) { <p><strong>{{ e.degree }}</strong>, {{ e.institute }}<br><span class="text-muted">{{ e.year }}</span></p> }</section>
          }
        </div>

        <aside class="stack">
          <section class="card">
            <h3>Actions</h3>
            <div class="stack">
              @if (recruiter.canMoveTo(a, 'Under Review')) { <button mat-stroked-button (click)="actions.review(a)">Mark under review</button> }
              @if (recruiter.canMoveTo(a, 'Shortlisted')) { <button mat-flat-button (click)="actions.shortlist(a)">Shortlist</button> }
              @if (recruiter.canSchedule(a)) { <button mat-flat-button (click)="actions.schedule(a)">Schedule interview</button> }
              @if (recruiter.canMoveTo(a, 'Selected')) { <button mat-flat-button (click)="actions.select(a)">Select candidate</button> }
              @if (recruiter.canMoveTo(a, 'Rejected')) { <button mat-stroked-button (click)="actions.reject(a)">Reject</button> }
              @if (a.status === 'Selected' || a.status === 'Rejected') { <p class="text-muted">This application is closed.</p> }
            </div>
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
          <section class="card"><h3>Progress</h3><app-application-timeline [application]="a" /></section>
        </aside>
      </div>
    } @else {
      <div class="card"><app-empty-state icon="person_off" title="Applicant not found" message="This application may belong to another company.">
        <a mat-flat-button routerLink="/recruiter/jobs">Back to my jobs</a></app-empty-state></div>
    }
  `,
  styles: `
    .top { margin-top: 16px; }
    .cols { display: grid; grid-template-columns: 1.4fr 1fr; gap: 16px; align-items: start; }
    .between { justify-content: space-between; align-items: flex-start; } h1 { font-size: 1.6rem; margin-bottom: 2px; }
    dl { margin: 0; } dt { color: var(--jh-muted); font-size: 0.85rem; margin-top: 10px; } dd { margin: 0; font-weight: 600; }
    .chips { gap: 8px; } .stack button { width: 100%; } .dl { margin-left: 12px; }
    @media (max-width: 860px) { .cols { grid-template-columns: 1fr; } }
  `,
})
export class ApplicantDetailsComponent {
  recruiter = inject(RecruiterService);
  actions = inject(ApplicantActions);
  resumes = inject(ResumeService);

  id = input('');
  app = computed(() => this.recruiter.getApplicant(+this.id()));
  interview = computed(() => this.recruiter.interviewFor(+this.id()));
}
