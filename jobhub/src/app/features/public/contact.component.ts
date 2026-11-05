import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-contact',
  imports: [ReactiveFormsModule, MatButtonModule, MatFormFieldModule, MatInputModule],
  template: `
    <div class="container narrow section">
      <h1>Contact us</h1>
      <p class="text-muted">Questions about your account or a job posting? Send us a message.</p>
      <form class="card stack" [formGroup]="form" (ngSubmit)="submit()">
        <mat-form-field appearance="outline">
          <mat-label>Your name</mat-label>
          <input matInput formControlName="name">
          @if (form.controls.name.hasError('required')) { <mat-error>Name is required.</mat-error> }
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Email</mat-label>
          <input matInput type="email" formControlName="email">
          @if (form.controls.email.hasError('required')) { <mat-error>Email is required.</mat-error> }
          @else if (form.controls.email.hasError('email')) { <mat-error>Enter a valid email address.</mat-error> }
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Message</mat-label>
          <textarea matInput rows="5" formControlName="message"></textarea>
          @if (form.controls.message.hasError('required')) { <mat-error>Message is required.</mat-error> }
          @else if (form.controls.message.hasError('minlength')) { <mat-error>Write at least 10 characters.</mat-error> }
        </mat-form-field>
        <button mat-flat-button type="submit">Send message</button>
      </form>
    </div>
  `,
  styles: `.narrow { max-width: 640px; }`,
})
export class ContactComponent {
  private toast = inject(ToastService);
  form = inject(FormBuilder).nonNullable.group({
    name: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    message: ['', [Validators.required, Validators.minLength(10)]],
  });

  submit(): void {
    if (this.form.invalid) return this.form.markAllAsTouched();
    // Not sent anywhere yet; there is no contact endpoint in the plan.
    this.toast.success('Message sent. We will reply by email.');
    this.form.reset();
  }
}
