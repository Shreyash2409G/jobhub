import { Component, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { RecruiterService } from '../../core/services/recruiter.service';
import { ToastService } from '../../core/services/toast.service';
import { apiMessage } from '../../core/utils/api-error';
import { CompanyLogoComponent } from '../../shared/components/company-logo.component';

@Component({
  selector: 'app-company-profile',
  imports: [ReactiveFormsModule, MatButtonModule, MatFormFieldModule, MatInputModule, CompanyLogoComponent],
  template: `
    <h1>Company profile</h1>
    <form class="card" [formGroup]="form" (ngSubmit)="save()">
      <div class="row logo">
        <app-company-logo [name]="form.controls.name.value || 'Company'" [size]="64" />
        <span class="text-muted">Your logo is generated from your company name. Logo upload arrives with the backend.</span>
      </div>

      <mat-form-field appearance="outline">
        <mat-label>Company name</mat-label>
        <input matInput formControlName="name">
        @if (form.controls.name.hasError('required')) { <mat-error>Company name is required.</mat-error> }
        @else if (form.controls.name.hasError('minlength')) { <mat-error>Enter at least 2 characters.</mat-error> }
      </mat-form-field>
      <div class="two">
        <mat-form-field appearance="outline">
          <mat-label>Industry</mat-label>
          <input matInput formControlName="industry" placeholder="e.g. Fintech">
          @if (form.controls.industry.hasError('required')) { <mat-error>Industry is required.</mat-error> }
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Location</mat-label>
          <input matInput formControlName="location" placeholder="e.g. Pune">
          @if (form.controls.location.hasError('required')) { <mat-error>Location is required.</mat-error> }
        </mat-form-field>
      </div>
      <mat-form-field appearance="outline">
        <mat-label>Website</mat-label>
        <input matInput formControlName="website" placeholder="https://example.com">
        @if (form.controls.website.hasError('pattern')) { <mat-error>Enter a full link starting with http:// or https://</mat-error> }
      </mat-form-field>
      <mat-form-field appearance="outline">
        <mat-label>About the company</mat-label>
        <textarea matInput rows="5" formControlName="description" maxlength="800"></textarea>
        <mat-hint align="end">{{ form.controls.description.value.length }}/800</mat-hint>
        @if (form.controls.description.hasError('required')) { <mat-error>Description is required.</mat-error> }
        @else if (form.controls.description.hasError('minlength')) { <mat-error>Write at least 30 characters.</mat-error> }
      </mat-form-field>
      <button mat-flat-button type="submit">{{ recruiter.company() ? 'Save changes' : 'Create company profile' }}</button>
    </form>
  `,
  styles: `
    .logo { gap: 16px; margin-bottom: 16px; }
    .two { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    @media (max-width: 640px) { .two { grid-template-columns: 1fr; } }
  `,
})
export class CompanyProfileComponent {
  recruiter = inject(RecruiterService);
  private toast = inject(ToastService);

  form = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(2), Validators.maxLength(80)] }),
    industry: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    location: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    website: new FormControl('', { nonNullable: true, validators: [Validators.pattern(/^https?:\/\/\S+\.\S+$/)] }),
    description: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(30)] }),
  });

  constructor() {
    const c = this.recruiter.company();
    if (c) this.form.patchValue({ name: c.name, industry: c.industry, location: c.location, website: c.website ?? '', description: c.description });
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return this.toast.error('Please fix the highlighted fields.');
    }
    const v = this.form.getRawValue();
    this.recruiter
      .saveCompany({ name: v.name.trim(), industry: v.industry.trim(), location: v.location.trim(), website: v.website.trim() || undefined, description: v.description.trim() })
      .subscribe({
        next: () => this.toast.success('Company profile saved successfully.'),
        error: (err) => this.toast.error(apiMessage(err)),
      });
  }
}
