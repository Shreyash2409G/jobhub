import { Component, inject } from '@angular/core';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { InterviewInput } from '../../core/services/recruiter.service';

const inFuture = (c: AbstractControl): ValidationErrors | null => (c.value && new Date(c.value) <= new Date() ? { past: true } : null);
const localInput = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);

@Component({
  selector: 'app-schedule-interview-dialog',
  imports: [ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule],
  template: `
    <h2 mat-dialog-title>Schedule interview</h2>
    <form [formGroup]="form" (ngSubmit)="submit()">
      <mat-dialog-content>
        <p class="text-muted">Candidate: <strong>{{ data.candidateName }}</strong></p>
        <mat-form-field appearance="outline">
          <mat-label>Date and time</mat-label>
          <input matInput type="datetime-local" formControlName="when" [min]="min">
          @if (form.controls.when.hasError('required')) { <mat-error>Pick a date and time.</mat-error> }
          @else if (form.controls.when.hasError('past')) { <mat-error>Choose a time in the future.</mat-error> }
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Mode</mat-label>
          <mat-select formControlName="mode">
            <mat-option value="Online">Online</mat-option>
            <mat-option value="On-site">On-site</mat-option>
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>{{ form.controls.mode.value === 'Online' ? 'Meeting link or platform (optional)' : 'Office address' }}</mat-label>
          <input matInput formControlName="location">
          @if (form.controls.location.hasError('required')) { <mat-error>Enter the office address.</mat-error> }
        </mat-form-field>
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-button type="button" mat-dialog-close>Cancel</button>
        <button mat-flat-button type="submit">Schedule</button>
      </mat-dialog-actions>
    </form>
  `,
  styles: `mat-dialog-content { display: flex; flex-direction: column; min-width: min(420px, 80vw); }`,
})
export class ScheduleInterviewDialogComponent {
  data = inject<{ candidateName: string }>(MAT_DIALOG_DATA);
  private ref = inject(MatDialogRef<ScheduleInterviewDialogComponent, InterviewInput>);

  min = localInput(new Date());
  form = new FormGroup({
    when: new FormControl('', { nonNullable: true, validators: [Validators.required, inFuture] }),
    mode: new FormControl<'Online' | 'On-site'>('Online', { nonNullable: true }),
    location: new FormControl('', { nonNullable: true }),
  });

  constructor() {
    // An office address is mandatory for on-site interviews only
    this.form.controls.mode.valueChanges.subscribe((mode) => {
      const location = this.form.controls.location;
      location.setValidators(mode === 'On-site' ? [Validators.required] : []);
      location.updateValueAndValidity();
    });
  }

  submit(): void {
    if (this.form.invalid) return this.form.markAllAsTouched();
    const v = this.form.getRawValue();
    this.ref.close({ scheduledAt: new Date(v.when).toISOString(), mode: v.mode, location: v.location.trim() || undefined });
  }
}
