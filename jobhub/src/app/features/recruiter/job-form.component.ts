import { Component, computed, inject, signal } from '@angular/core';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { ExperienceBand, JobType, Skill, WorkMode } from '../../core/models';
import { EXPERIENCE_BANDS, JOB_TYPES, WORK_MODES } from '../../core/models/job-options';
import { LOCATIONS, SKILL_SUGGESTIONS } from '../../core/constants/lookups';
import { JobService } from '../../core/services/job.service';
import { RecruiterService } from '../../core/services/recruiter.service';
import { ToastService } from '../../core/services/toast.service';
import { apiMessage } from '../../core/utils/api-error';
import { EmptyStateComponent } from '../../shared/components/empty-state.component';

const lines = (text: string) => text.split('\n').map((l) => l.trim()).filter(Boolean);
const toDateInput = (iso: string) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const notInPast = (c: AbstractControl): ValidationErrors | null => {
  if (!c.value) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return new Date(c.value + 'T00:00:00') < today ? { past: true } : null;
};
const salaryOrder = (g: AbstractControl): ValidationErrors | null => {
  const min = g.get('salaryMin')?.value, max = g.get('salaryMax')?.value;
  return min !== null && max !== null && max < min ? { salaryRange: true } : null;
};

/** One form for both "Post job" (/recruiter/jobs/create) and "Edit job" (/recruiter/jobs/:id/edit). */
@Component({
  selector: 'app-job-form',
  imports: [ReactiveFormsModule, RouterLink, MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule, MatSelectModule, EmptyStateComponent],
  template: `
    <h1>{{ jobId ? 'Edit job' : 'Post a job' }}</h1>

    @if (!recruiter.company()) {
      <div class="card"><app-empty-state icon="business" title="Create your company profile first" message="Jobs are posted under your company.">
        <a mat-flat-button routerLink="/recruiter/company">Create company profile</a></app-empty-state></div>
    } @else if (jobId && !recruiter.getJob(jobId)) {
      <div class="card"><app-empty-state icon="work_off" title="Job not found" message="It may have been deleted, or it belongs to another company.">
        <a mat-flat-button routerLink="/recruiter/jobs">Back to my jobs</a></app-empty-state></div>
    } @else {
      <form class="stack" [formGroup]="form" (ngSubmit)="submit()">
        <section class="card">
          <h3>Basics</h3>
          <mat-form-field appearance="outline">
            <mat-label>Job title</mat-label>
            <input matInput formControlName="title" placeholder="e.g. Angular Developer">
            @if (form.controls.title.hasError('required')) { <mat-error>Job title is required.</mat-error> }
            @else if (form.controls.title.hasError('minlength')) { <mat-error>Enter at least 3 characters.</mat-error> }
          </mat-form-field>
          <div class="two">
            <mat-form-field appearance="outline">
              <mat-label>Category</mat-label>
              <mat-select formControlName="category">@for (c of categories(); track c.id) { <mat-option [value]="c.id">{{ c.name }}</mat-option> }</mat-select>
              @if (form.controls.category.hasError('required')) { <mat-error>Choose a category.</mat-error> }
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Location</mat-label>
              <mat-select formControlName="location">@for (l of locations; track l) { <mat-option [value]="l">{{ l }}</mat-option> }</mat-select>
              @if (form.controls.location.hasError('required')) { <mat-error>Choose a location.</mat-error> }
            </mat-form-field>
          </div>
          <div class="three">
            <mat-form-field appearance="outline"><mat-label>Job type</mat-label>
              <mat-select formControlName="jobType">@for (o of jobTypes; track o) { <mat-option [value]="o">{{ o }}</mat-option> }</mat-select></mat-form-field>
            <mat-form-field appearance="outline"><mat-label>Experience</mat-label>
              <mat-select formControlName="experience">@for (o of experiences; track o) { <mat-option [value]="o">{{ o }}</mat-option> }</mat-select></mat-form-field>
            <mat-form-field appearance="outline"><mat-label>Work mode</mat-label>
              <mat-select formControlName="workMode">@for (o of workModes; track o) { <mat-option [value]="o">{{ o }}</mat-option> }</mat-select></mat-form-field>
          </div>
          <div class="three">
            <mat-form-field appearance="outline"><mat-label>Minimum salary (LPA)</mat-label>
              <input matInput type="number" min="0" formControlName="salaryMin">
              @if (form.controls.salaryMin.invalid) { <mat-error>Enter a valid amount.</mat-error> }</mat-form-field>
            <mat-form-field appearance="outline"><mat-label>Maximum salary (LPA)</mat-label>
              <input matInput type="number" min="0" formControlName="salaryMax">
              @if (form.controls.salaryMax.invalid) { <mat-error>Enter a valid amount.</mat-error> }</mat-form-field>
            <mat-form-field appearance="outline"><mat-label>Application deadline</mat-label>
              <input matInput type="date" formControlName="deadline">
              @if (form.controls.deadline.hasError('required')) { <mat-error>Deadline is required.</mat-error> }
              @else if (form.controls.deadline.hasError('past')) { <mat-error>Deadline cannot be in the past.</mat-error> }</mat-form-field>
          </div>
          @if (form.hasError('salaryRange') && form.controls.salaryMax.touched) { <p class="form-error">Maximum salary must be at least the minimum.</p> }
        </section>

        <section class="card">
          <h3>Description</h3>
          <mat-form-field appearance="outline"><mat-label>About the role</mat-label>
            <textarea matInput rows="4" formControlName="description"></textarea>
            @if (form.controls.description.hasError('required')) { <mat-error>Description is required.</mat-error> }
            @else if (form.controls.description.hasError('minlength')) { <mat-error>Write at least 30 characters.</mat-error> }</mat-form-field>
          <mat-form-field appearance="outline"><mat-label>Responsibilities (one per line)</mat-label>
            <textarea matInput rows="4" formControlName="responsibilities"></textarea>
            @if (form.controls.responsibilities.hasError('required')) { <mat-error>Add at least one responsibility.</mat-error> }</mat-form-field>
          <mat-form-field appearance="outline"><mat-label>Requirements (one per line)</mat-label>
            <textarea matInput rows="4" formControlName="requirements"></textarea>
            @if (form.controls.requirements.hasError('required')) { <mat-error>Add at least one requirement.</mat-error> }</mat-form-field>
          <mat-form-field appearance="outline"><mat-label>Benefits, optional (one per line)</mat-label>
            <textarea matInput rows="3" formControlName="benefits"></textarea></mat-form-field>
        </section>

        <section class="card">
          <h3>Skills</h3>
          <div class="row chips">
            @for (s of skills(); track s.id) {
              <span class="chip">{{ s.name }}<button type="button" class="x" (click)="removeSkill(s)" [attr.aria-label]="'Remove ' + s.name"><mat-icon>close</mat-icon></button></span>
            }
          </div>
          <div class="row add">
            <mat-form-field appearance="outline" subscriptSizing="dynamic">
              <mat-label>Add a skill</mat-label>
              <input matInput [formControl]="skillInput" list="job-skill-options" (keydown.enter)="$event.preventDefault(); addSkill()">
              <datalist id="job-skill-options">@for (s of allSkills; track s.id) { <option [value]="s.name"></option> }</datalist>
            </mat-form-field>
            <button mat-stroked-button type="button" (click)="addSkill()">Add</button>
          </div>
          @if (skillsError()) { <p class="form-error">Add at least one skill.</p> }
        </section>

        <div class="row">
          <button mat-flat-button type="submit" [disabled]="saving()">{{ saving() ? 'Saving…' : jobId ? 'Save changes' : 'Post job' }}</button>
          <a mat-button routerLink="/recruiter/jobs">Cancel</a>
        </div>
      </form>
    }
  `,
  styles: `
    .two { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .three { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
    .chips { gap: 8px; margin-bottom: 12px; }
    .chip .x { border: 0; background: none; padding: 0; cursor: pointer; display: inline-flex; color: inherit; }
    .add { align-items: flex-start; } .add mat-form-field { flex: 1; max-width: 360px; } .add button { height: 56px; }
    @media (max-width: 760px) { .two, .three { grid-template-columns: 1fr; } }
  `,
})
export class JobFormComponent {
  recruiter = inject(RecruiterService);
  private router = inject(Router);
  private toast = inject(ToastService);

  readonly jobId = Number(inject(ActivatedRoute).snapshot.paramMap.get('id')) || null;
  readonly locations = LOCATIONS;
  readonly jobTypes: JobType[] = JOB_TYPES;
  readonly experiences: ExperienceBand[] = EXPERIENCE_BANDS;
  readonly workModes: WorkMode[] = WORK_MODES;
  readonly allSkills = SKILL_SUGGESTIONS;
  categories = toSignal(inject(JobService).getCategories(), { initialValue: [] });

  skills = signal<Skill[]>([]);
  skillsError = signal(false);
  saving = signal(false);
  skillInput = new FormControl('', { nonNullable: true });

  form = new FormGroup(
    {
      title: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(3), Validators.maxLength(100)] }),
      category: new FormControl<number | null>(null, [Validators.required]),
      location: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
      jobType: new FormControl<JobType>('Full Time', { nonNullable: true }),
      experience: new FormControl<ExperienceBand>('Fresher', { nonNullable: true }),
      workMode: new FormControl<WorkMode>('On-site', { nonNullable: true }),
      salaryMin: new FormControl<number | null>(null, [Validators.required, Validators.min(0)]),
      salaryMax: new FormControl<number | null>(null, [Validators.required, Validators.min(0)]),
      deadline: new FormControl('', { nonNullable: true, validators: [Validators.required, notInPast] }),
      description: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(30)] }),
      responsibilities: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
      requirements: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
      benefits: new FormControl('', { nonNullable: true }),
    },
    { validators: salaryOrder }
  );

  constructor() {
    const job = this.jobId ? this.recruiter.getJob(this.jobId) : undefined;
    if (job) {
      this.form.patchValue({
        title: job.title, category: job.category.id, location: job.location, jobType: job.jobType, experience: job.experience,
        workMode: job.workMode, salaryMin: job.salaryMin, salaryMax: job.salaryMax, deadline: toDateInput(job.applicationDeadline),
        description: job.description, responsibilities: job.responsibilities.join('\n'), requirements: job.requirements.join('\n'),
        benefits: job.benefits.join('\n'),
      });
      this.skills.set(job.skills);
    }
  }

  addSkill(): void {
    const name = this.skillInput.value.trim();
    if (!name) return;
    if (this.skills().some((s) => s.name.toLowerCase() === name.toLowerCase())) return this.toast.info('That skill is already added.');
    this.skills.update((list) => [...list, { id: Date.now(), name }]); // the API matches skills by name
    this.skillsError.set(false);
    this.skillInput.reset('');
  }

  removeSkill(skill: Skill): void { this.skills.update((list) => list.filter((s) => s.id !== skill.id)); }

  submit(): void {
    this.skillsError.set(this.skills().length === 0);
    if (this.form.invalid || this.skillsError()) {
      this.form.markAllAsTouched();
      return this.toast.error('Please fix the highlighted fields.');
    }
    const v = this.form.getRawValue();
    const input = {
      title: v.title.trim(), description: v.description.trim(), responsibilities: lines(v.responsibilities),
      requirements: lines(v.requirements), benefits: lines(v.benefits), skills: this.skills(), location: v.location,
      jobType: v.jobType, experience: v.experience, workMode: v.workMode, salaryMin: v.salaryMin!, salaryMax: v.salaryMax!,
      applicationDeadline: new Date(v.deadline + 'T23:59:59').toISOString(), categoryId: v.category!,
    };
    this.saving.set(true);
    const request = this.jobId ? this.recruiter.updateJob(this.jobId, input) : this.recruiter.createJob(input);
    request.subscribe({
      next: () => {
        this.toast.success(this.jobId ? 'Job updated successfully.' : 'Job posted successfully.');
        this.router.navigateByUrl('/recruiter/jobs');
      },
      error: (err) => {
        this.saving.set(false);
        this.toast.error(apiMessage(err));
      },
    });
  }
}
