import { Component, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

const REASONS = ['Fake or misleading job', 'Asks for money or a fee', 'Discriminatory content', 'Duplicate posting', 'Other'];

/** Closes with one sentence (reason and details) for the API, or nothing if cancelled. */
@Component({
  selector: 'app-report-job-dialog',
  imports: [ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule],
  template: `
    <h2 mat-dialog-title>Report this job</h2>
    <form [formGroup]="form" (ngSubmit)="submit()">
      <mat-dialog-content>
        <p class="text-muted">{{ data.jobTitle }}</p>
        <mat-form-field appearance="outline">
          <mat-label>What is wrong?</mat-label>
          <mat-select formControlName="reason">@for (r of reasons; track r) { <mat-option [value]="r">{{ r }}</mat-option> }</mat-select>
          @if (form.controls.reason.hasError('required')) { <mat-error>Choose a reason.</mat-error> }
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Details {{ form.controls.reason.value === 'Other' ? '' : '(optional)' }}</mat-label>
          <textarea matInput rows="3" maxlength="180" formControlName="details"></textarea>
          @if (form.controls.details.hasError('required')) { <mat-error>Tell us a little more.</mat-error> }
        </mat-form-field>
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-button type="button" mat-dialog-close>Cancel</button>
        <button mat-flat-button type="submit">Send report</button>
      </mat-dialog-actions>
    </form>
  `,
  styles: `mat-dialog-content { display: flex; flex-direction: column; min-width: min(420px, 80vw); }`,
})
export class ReportJobDialogComponent {
  data = inject<{ jobTitle: string }>(MAT_DIALOG_DATA);
  private ref = inject(MatDialogRef<ReportJobDialogComponent, string>);
  reasons = REASONS;

  form = new FormGroup({
    reason: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    details: new FormControl('', { nonNullable: true }),
  });

  constructor() {
    // Details are mandatory only when the reason is "Other"
    this.form.controls.reason.valueChanges.subscribe((reason) => {
      this.form.controls.details.setValidators(reason === 'Other' ? [Validators.required] : []);
      this.form.controls.details.updateValueAndValidity();
    });
  }

  submit(): void {
    if (this.form.invalid) return this.form.markAllAsTouched();
    const { reason, details } = this.form.getRawValue();
    this.ref.close(details.trim() ? `${reason}: ${details.trim()}` : reason);
  }
}
