import { Component, inject, input, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { apiMessage } from '../../core/utils/api-error';

function matchesPassword(control: AbstractControl): ValidationErrors | null {
  const password = control.parent?.get('password')?.value;
  return control.value && control.value !== password ? { mismatch: true } : null;
}

@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, RouterLink, MatButtonModule, MatButtonToggleModule, MatFormFieldModule, MatInputModule],
  template: `
    <div class="auth-wrap">
      <form class="card auth-card" [formGroup]="form" (ngSubmit)="submit()">
        <h2>Create your account</h2>
        @if (error()) { <p class="form-error" role="alert">{{ error() }}</p> }

        <mat-button-toggle-group formControlName="role" class="roles" aria-label="Account type">
          <mat-button-toggle value="candidate">I am a job seeker</mat-button-toggle>
          <mat-button-toggle value="recruiter">I am hiring</mat-button-toggle>
        </mat-button-toggle-group>

        <mat-form-field appearance="outline">
          <mat-label>Full name</mat-label>
          <input matInput formControlName="name" autocomplete="name">
          @if (form.controls.name.hasError('required')) { <mat-error>Name is required.</mat-error> }
          @else if (form.controls.name.hasError('minlength')) { <mat-error>Enter at least 2 characters.</mat-error> }
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Email</mat-label>
          <input matInput type="email" formControlName="email" autocomplete="email">
          @if (form.controls.email.hasError('required')) { <mat-error>Email is required.</mat-error> }
          @else if (form.controls.email.hasError('email')) { <mat-error>Enter a valid email address.</mat-error> }
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Password</mat-label>
          <input matInput type="password" formControlName="password" autocomplete="new-password">
          <mat-hint>At least 8 characters with a letter and a number</mat-hint>
          @if (form.controls.password.hasError('required')) { <mat-error>Password is required.</mat-error> }
          @else if (form.controls.password.invalid) { <mat-error>Use 8+ characters with a letter and a number.</mat-error> }
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Confirm password</mat-label>
          <input matInput type="password" formControlName="confirmPassword" autocomplete="new-password">
          @if (form.controls.confirmPassword.hasError('required')) { <mat-error>Confirm your password.</mat-error> }
          @else if (form.controls.confirmPassword.hasError('mismatch')) { <mat-error>Passwords do not match.</mat-error> }
        </mat-form-field>

        <button mat-flat-button type="submit" class="full" [disabled]="submitting()">
          {{ submitting() ? 'Creating account…' : 'Create account' }}
        </button>
        <p class="alt text-muted">Already have an account? <a routerLink="/login" [queryParams]="returnUrl() ? { returnUrl: returnUrl() } : null">Login</a></p>
      </form>
    </div>
  `,
  styles: `
    .roles { width: 100%; margin-bottom: 20px; } .roles mat-button-toggle { flex: 1; }
    .full { width: 100%; height: 48px; } .alt { text-align: center; margin: 16px 0 0; }
  `,
})
export class RegisterComponent {
  private auth = inject(AuthService);
  private router = inject(Router);
  private toast = inject(ToastService);

  /** From ?returnUrl=... . The router sets it to undefined when the query parameter is missing. */
  returnUrl = input<string | undefined>();
  submitting = signal(false);
  error = signal('');

  form = inject(FormBuilder).nonNullable.group({
    role: ['candidate' as 'candidate' | 'recruiter'],
    name: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8), Validators.pattern(/^(?=.*[A-Za-z])(?=.*\d).+$/)]],
    confirmPassword: ['', [Validators.required, matchesPassword]],
  });

  constructor() {
    // Re-check the match whenever the password changes
    this.form.controls.password.valueChanges.subscribe(() => this.form.controls.confirmPassword.updateValueAndValidity());
  }

  submit(): void {
    if (this.form.invalid) return this.form.markAllAsTouched();
    const { confirmPassword, ...request } = this.form.getRawValue();
    this.submitting.set(true);
    this.error.set('');
    this.auth.register(request).subscribe({
      next: (user) => {
        this.toast.success('Account created successfully.');
        const url = this.returnUrl();
        const safe = typeof url === 'string' && url.startsWith('/') && !url.startsWith('//') ? url : null;
        this.goTo(safe ?? this.auth.homeRoute(user.role));
      },
      error: (err) => { this.error.set(apiMessage(err)); this.submitting.set(false); },
    });
  }

  /** If the navigation does not complete, reset the form instead of leaving the button stuck. */
  private goTo(url: string): void {
    this.router.navigateByUrl(url)
      .then((ok) => { if (!ok) this.navigationFailed(); })
      .catch((err) => { console.error('Navigation failed', err); this.navigationFailed(); });
  }

  private navigationFailed(): void {
    this.submitting.set(false);
    this.error.set('You are signed in, but the next page could not open. Use the Dashboard link in the top menu. Details are in the browser console (F12).');
  }
}
