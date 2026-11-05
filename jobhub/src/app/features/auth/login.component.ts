import { Component, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { apiMessage } from '../../core/utils/api-error';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink, MatButtonModule, MatFormFieldModule, MatInputModule],
  template: `
    <div class="auth-wrap">
      <form class="card auth-card" [formGroup]="form" (ngSubmit)="submit()">
        <h2>Login to JobHub</h2>
        @if (error()) { <p class="form-error" role="alert">{{ error() }}</p> }

        <mat-form-field appearance="outline">
          <mat-label>Email</mat-label>
          <input matInput type="email" formControlName="email" autocomplete="email">
          @if (form.controls.email.hasError('required')) { <mat-error>Email is required.</mat-error> }
          @else if (form.controls.email.hasError('email')) { <mat-error>Enter a valid email address.</mat-error> }
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Password</mat-label>
          <input matInput type="password" formControlName="password" autocomplete="current-password">
          @if (form.controls.password.hasError('required')) { <mat-error>Password is required.</mat-error> }
        </mat-form-field>

        <button mat-flat-button type="submit" class="full" [disabled]="submitting()">
          {{ submitting() ? 'Logging in…' : 'Login' }}
        </button>
        <p class="alt text-muted">New to JobHub? <a routerLink="/register" [queryParams]="returnUrl() ? { returnUrl: returnUrl() } : null">Create an account</a></p>
        @if (showDemo) {
          <p class="hint text-muted">Demo accounts (created by backend/seed.py): candidate&#64;jobhub.demo / recruiter&#64;jobhub.demo / admin&#64;jobhub.demo, password Password&#64;123</p>
        }
      </form>
    </div>
  `,
  styles: `.full { width: 100%; height: 48px; } .alt { text-align: center; margin: 16px 0 0; } .hint { font-size: 0.8rem; text-align: center; margin: 8px 0 0; }`,
})
export class LoginComponent {
  private auth = inject(AuthService);
  private router = inject(Router);
  private toast = inject(ToastService);

  /** From ?returnUrl=... . The router sets it to undefined when the query parameter is missing. */
  returnUrl = input<string | undefined>();
  showDemo = environment.showDemoAccounts;
  submitting = signal(false);
  error = signal('');

  form = inject(FormBuilder).nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  submit(): void {
    if (this.form.invalid) return this.form.markAllAsTouched();
    this.submitting.set(true);
    this.error.set('');
    this.auth.login(this.form.getRawValue()).subscribe({
      next: (user) => {
        this.toast.success(`Welcome back, ${user.name.split(' ')[0]}.`);
        this.goTo(this.safeReturnUrl() ?? this.auth.homeRoute(user.role));
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

  /** Only follow in-app paths, never external URLs. */
  private safeReturnUrl(): string | null {
    const url = this.returnUrl();
    return typeof url === 'string' && url.startsWith('/') && !url.startsWith('//') ? url : null;
  }
}
