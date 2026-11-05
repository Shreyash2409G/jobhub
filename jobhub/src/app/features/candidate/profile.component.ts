import { Component, inject, signal } from '@angular/core';
import { FormArray, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { Education, Experience, Skill } from '../../core/models';
import { CandidateService } from '../../core/services/candidate.service';
import { ToastService } from '../../core/services/toast.service';
import { apiMessage } from '../../core/utils/api-error';
import { SKILL_SUGGESTIONS } from '../../core/constants/lookups';

const required = { nonNullable: true as const, validators: [Validators.required] };

const educationGroup = (e?: Education) =>
  new FormGroup({
    degree: new FormControl(e?.degree ?? '', required),
    institute: new FormControl(e?.institute ?? '', required),
    year: new FormControl(e?.year ?? new Date().getFullYear(), {
      nonNullable: true, validators: [Validators.required, Validators.min(1980), Validators.max(2040)],
    }),
  });

const experienceGroup = (e?: Experience) =>
  new FormGroup({
    title: new FormControl(e?.title ?? '', required),
    company: new FormControl(e?.company ?? '', required),
    from: new FormControl(e?.from ?? '', required),
    to: new FormControl(e?.to ?? '', { nonNullable: true }),
    description: new FormControl(e?.description ?? '', { nonNullable: true, validators: [Validators.maxLength(300)] }),
  });

@Component({
  selector: 'app-profile',
  imports: [ReactiveFormsModule, MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule],
  template: `
    <h1>My profile</h1>
    <form class="stack" [formGroup]="form" (ngSubmit)="save()">
      <section class="card">
        <h3>Personal information</h3>
        <mat-form-field appearance="outline">
          <mat-label>Professional headline</mat-label>
          <input matInput formControlName="headline" placeholder="e.g. Angular Developer">
          @if (form.controls.headline.hasError('required')) { <mat-error>Headline is required.</mat-error> }
        </mat-form-field>
        <div class="two">
          <mat-form-field appearance="outline">
            <mat-label>Phone</mat-label>
            <input matInput formControlName="phone" inputmode="numeric" maxlength="10">
            <mat-hint>10-digit mobile number</mat-hint>
            @if (form.controls.phone.hasError('pattern')) { <mat-error>Enter a valid 10-digit mobile number.</mat-error> }
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Location</mat-label>
            <input matInput formControlName="location" placeholder="e.g. Pune">
          </mat-form-field>
        </div>
        <mat-form-field appearance="outline">
          <mat-label>About you</mat-label>
          <textarea matInput rows="4" formControlName="about" maxlength="500"></textarea>
          <mat-hint align="end">{{ form.controls.about.value.length }}/500</mat-hint>
        </mat-form-field>
      </section>

      <section class="card">
        <h3>Skills</h3>
        <div class="row chips">
          @for (s of skills(); track s.id) {
            <span class="chip">{{ s.name }}
              <button type="button" class="x" (click)="removeSkill(s)" [attr.aria-label]="'Remove ' + s.name"><mat-icon>close</mat-icon></button>
            </span>
          }
          @if (!skills().length) { <span class="text-muted">No skills added yet.</span> }
        </div>
        <div class="row add">
          <mat-form-field appearance="outline" subscriptSizing="dynamic">
            <mat-label>Add a skill</mat-label>
            <input matInput [formControl]="skillInput" list="skill-options" (keydown.enter)="$event.preventDefault(); addSkill()">
            <datalist id="skill-options">@for (s of allSkills; track s.id) { <option [value]="s.name"></option> }</datalist>
          </mat-form-field>
          <button mat-stroked-button type="button" (click)="addSkill()">Add</button>
        </div>
      </section>

      <section class="card" formArrayName="education">
        <div class="row between"><h3>Education</h3><button mat-button type="button" (click)="addEducation()"><mat-icon>add</mat-icon> Add</button></div>
        @for (g of form.controls.education.controls; track g; let i = $index) {
          <div class="block" [formGroupName]="i">
            <div class="two">
              <mat-form-field appearance="outline"><mat-label>Degree</mat-label><input matInput formControlName="degree">
                @if (g.controls.degree.hasError('required')) { <mat-error>Required.</mat-error> }</mat-form-field>
              <mat-form-field appearance="outline"><mat-label>Institute</mat-label><input matInput formControlName="institute">
                @if (g.controls.institute.hasError('required')) { <mat-error>Required.</mat-error> }</mat-form-field>
            </div>
            <div class="row between">
              <mat-form-field appearance="outline" class="year"><mat-label>Year of passing</mat-label><input matInput type="number" formControlName="year">
                @if (g.controls.year.invalid) { <mat-error>Enter a valid year.</mat-error> }</mat-form-field>
              <button mat-button type="button" (click)="form.controls.education.removeAt(i)">Remove</button>
            </div>
          </div>
        }
        @if (!form.controls.education.length) { <p class="text-muted">No education added yet.</p> }
      </section>

      <section class="card" formArrayName="experience">
        <div class="row between"><h3>Experience</h3><button mat-button type="button" (click)="addExperience()"><mat-icon>add</mat-icon> Add</button></div>
        @for (g of form.controls.experience.controls; track g; let i = $index) {
          <div class="block" [formGroupName]="i">
            <div class="two">
              <mat-form-field appearance="outline"><mat-label>Job title</mat-label><input matInput formControlName="title">
                @if (g.controls.title.hasError('required')) { <mat-error>Required.</mat-error> }</mat-form-field>
              <mat-form-field appearance="outline"><mat-label>Company</mat-label><input matInput formControlName="company">
                @if (g.controls.company.hasError('required')) { <mat-error>Required.</mat-error> }</mat-form-field>
            </div>
            <div class="two">
              <mat-form-field appearance="outline"><mat-label>From</mat-label><input matInput type="month" formControlName="from">
                @if (g.controls.from.hasError('required')) { <mat-error>Required.</mat-error> }</mat-form-field>
              <mat-form-field appearance="outline"><mat-label>To (leave empty if current)</mat-label><input matInput type="month" formControlName="to"></mat-form-field>
            </div>
            <mat-form-field appearance="outline"><mat-label>What did you do?</mat-label><textarea matInput rows="2" formControlName="description" maxlength="300"></textarea></mat-form-field>
            <button mat-button type="button" (click)="form.controls.experience.removeAt(i)">Remove</button>
          </div>
        }
        @if (!form.controls.experience.length) { <p class="text-muted">No experience added yet.</p> }
      </section>

      <div><button mat-flat-button type="submit">Save profile</button></div>
    </form>
  `,
  styles: `
    .two { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .between { justify-content: space-between; }
    .block { border-top: 1px solid var(--jh-border); padding-top: 16px; margin-top: 8px; }
    .year { max-width: 200px; }
    .chips { gap: 8px; margin-bottom: 16px; }
    .chip .x { border: 0; background: none; padding: 0; cursor: pointer; display: inline-flex; color: inherit; }
    .add { align-items: flex-start; } .add mat-form-field { flex: 1; max-width: 360px; } .add button { height: 56px; }
    @media (max-width: 640px) { .two { grid-template-columns: 1fr; } }
  `,
})
export class ProfileComponent {
  private candidate = inject(CandidateService);
  private toast = inject(ToastService);

  allSkills = SKILL_SUGGESTIONS;
  skills = signal<Skill[]>([]);
  skillInput = new FormControl('', { nonNullable: true });

  form = new FormGroup({
    headline: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(80)] }),
    phone: new FormControl('', { nonNullable: true, validators: [Validators.pattern(/^[6-9]\d{9}$/)] }),
    location: new FormControl('', { nonNullable: true }),
    about: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(500)] }),
    education: new FormArray<ReturnType<typeof educationGroup>>([]),
    experience: new FormArray<ReturnType<typeof experienceGroup>>([]),
  });

  constructor() {
    const p = this.candidate.profile();
    this.form.patchValue({ headline: p.headline ?? '', phone: p.phone ?? '', location: p.location ?? '', about: p.about ?? '' });
    p.education.forEach((e) => this.form.controls.education.push(educationGroup(e)));
    p.experience.forEach((e) => this.form.controls.experience.push(experienceGroup(e)));
    this.skills.set(p.skills);
  }

  addEducation(): void { this.form.controls.education.push(educationGroup()); }
  addExperience(): void { this.form.controls.experience.push(experienceGroup()); }

  addSkill(): void {
    const name = this.skillInput.value.trim();
    if (!name) return;
    if (this.skills().some((s) => s.name.toLowerCase() === name.toLowerCase())) return this.toast.info('That skill is already added.');
    if (this.skills().length >= 15) return this.toast.error('You can add up to 15 skills.');
    this.skills.update((list) => [...list, { id: Date.now(), name }]); // real ids come back from the API on save
    this.skillInput.reset('');
  }

  removeSkill(skill: Skill): void { this.skills.update((list) => list.filter((s) => s.id !== skill.id)); }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return this.toast.error('Please fix the highlighted fields.');
    }
    const v = this.form.getRawValue();
    this.candidate
      .saveProfile({
        ...this.candidate.profile(),
        headline: v.headline.trim(),
        phone: v.phone || undefined,
        location: v.location.trim() || undefined,
        about: v.about.trim() || undefined,
        skills: this.skills(),
        education: v.education,
        experience: v.experience.map((e) => ({ ...e, to: e.to || undefined, description: e.description.trim() || undefined })),
      })
      .subscribe({
        next: (profile) => {
          this.skills.set(profile.skills); // now with the real ids
          this.toast.success('Profile updated successfully.');
        },
        error: (err) => this.toast.error(apiMessage(err)),
      });
  }
}
