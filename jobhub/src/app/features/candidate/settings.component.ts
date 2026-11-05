import { Component, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { AuthService } from '../../core/services/auth.service';
import { CandidateService, NotificationPrefs } from '../../core/services/candidate.service';
import { ToastService } from '../../core/services/toast.service';
import { apiMessage } from '../../core/utils/api-error';

@Component({
  selector: 'app-settings',
  imports: [ReactiveFormsModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatSlideToggleModule],
  template: `
    <h1>Settings</h1>
    <div class="stack">
      <form class="card" (ngSubmit)="saveName()">
        <h3>Account</h3>
        <mat-form-field appearance="outline">
          <mat-label>Full name</mat-label>
          <input matInput [formControl]="name">
          @if (name.hasError('required')) { <mat-error>Name is required.</mat-error> }
          @else if (name.hasError('minlength')) { <mat-error>Enter at least 2 characters.</mat-error> }
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Email</mat-label>
          <input matInput [value]="auth.user()?.email" disabled>
        </mat-form-field>
        <button mat-flat-button type="submit">Save changes</button>
      </form>

      <section class="card toggles">
        <h3>Email notifications</h3>
        <mat-slide-toggle [checked]="prefs().applicationUpdates" (change)="set('applicationUpdates', $event.checked)">Application status updates</mat-slide-toggle>
        <mat-slide-toggle [checked]="prefs().interviewReminders" (change)="set('interviewReminders', $event.checked)">Interview reminders</mat-slide-toggle>
        <mat-slide-toggle [checked]="prefs().jobRecommendations" (change)="set('jobRecommendations', $event.checked)">Job recommendations</mat-slide-toggle>
      </section>
    </div>
  `,
  styles: `.toggles { display: flex; flex-direction: column; gap: 12px; }`,
})
export class SettingsComponent {
  auth = inject(AuthService);
  private candidate = inject(CandidateService);
  private toast = inject(ToastService);

  name = new FormControl(this.auth.user()?.name ?? '', { nonNullable: true, validators: [Validators.required, Validators.minLength(2)] });
  prefs = this.candidate.prefs;

  saveName(): void {
    if (this.name.invalid) return this.name.markAsTouched();
    this.auth.updateName(this.name.value).subscribe({
      next: () => this.toast.success('Settings updated successfully.'),
      error: (err) => this.toast.error(apiMessage(err)),
    });
  }

  set(key: keyof NotificationPrefs, value: boolean): void {
    this.candidate.updatePrefs({ ...this.prefs(), [key]: value });
    this.toast.success('Settings updated successfully.');
  }
}
