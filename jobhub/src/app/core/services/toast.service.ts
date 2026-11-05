import { Injectable, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

/** One place for all toast messages, e.g. toast.success('Job saved successfully.') */
@Injectable({ providedIn: 'root' })
export class ToastService {
  private snackBar = inject(MatSnackBar);

  success(message: string): void { this.open(message, 'toast-success'); }
  error(message: string): void { this.open(message, 'toast-error', 5000); }
  info(message: string): void { this.open(message); }

  private open(message: string, panelClass?: string, duration = 3000): void {
    this.snackBar.open(message, 'Dismiss', {
      duration, panelClass, horizontalPosition: 'center', verticalPosition: 'bottom',
    });
  }
}
