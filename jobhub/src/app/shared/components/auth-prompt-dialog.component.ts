import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';

/** Shown to guests who try to apply for or save a job. */
@Component({
  selector: 'app-auth-prompt-dialog',
  imports: [MatDialogModule, MatButtonModule, RouterLink],
  template: `
    <h2 mat-dialog-title>{{ titles[data.action] }}</h2>
    <mat-dialog-content>
      Create a free JobHub account or login to
      {{ reasons[data.action] }}
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Not now</button>
      <a mat-button routerLink="/login" [queryParams]="{ returnUrl }" mat-dialog-close>Login</a>
      <a mat-flat-button routerLink="/register" [queryParams]="{ returnUrl }" mat-dialog-close>Create account</a>
    </mat-dialog-actions>
  `,
})
export class AuthPromptDialogComponent {
  data = inject<{ action: 'apply' | 'save' | 'report' }>(MAT_DIALOG_DATA);
  titles = { apply: 'Please login to apply', save: 'Please login to save jobs', report: 'Please login to report a job' };
  reasons = {
    apply: 'apply for this job and track your application.',
    save: 'save jobs and come back to them later.',
    report: 'report a job to our team.',
  };
  returnUrl = inject(Router).url;
}
