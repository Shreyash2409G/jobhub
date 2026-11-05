import { Component, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { Category } from '../../core/models';

/** Add or edit a category. Closes with { name, icon } or nothing. */
@Component({
  selector: 'app-category-dialog',
  imports: [ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule],
  template: `
    <h2 mat-dialog-title>{{ data.category ? 'Edit category' : 'Add category' }}</h2>
    <form [formGroup]="form" (ngSubmit)="submit()">
      <mat-dialog-content>
        <mat-form-field appearance="outline">
          <mat-label>Name</mat-label>
          <input matInput formControlName="name">
          @if (form.controls.name.hasError('required')) { <mat-error>Name is required.</mat-error> }
          @else if (form.controls.name.invalid) { <mat-error>Use 2 to 80 characters.</mat-error> }
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Icon (optional)</mat-label>
          @if (form.controls.icon.value) { <mat-icon matPrefix>{{ form.controls.icon.value }}</mat-icon> }
          <input matInput formControlName="icon" placeholder="e.g. code, brush, insights">
          <mat-hint>Any Material icon name</mat-hint>
        </mat-form-field>
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-button type="button" mat-dialog-close>Cancel</button>
        <button mat-flat-button type="submit">{{ data.category ? 'Save' : 'Add' }}</button>
      </mat-dialog-actions>
    </form>
  `,
  styles: `mat-dialog-content { display: flex; flex-direction: column; min-width: min(380px, 80vw); }`,
})
export class CategoryDialogComponent {
  data = inject<{ category?: Category }>(MAT_DIALOG_DATA);
  private ref = inject(MatDialogRef<CategoryDialogComponent, { name: string; icon?: string }>);

  form = new FormGroup({
    name: new FormControl(this.data.category?.name ?? '', { nonNullable: true, validators: [Validators.required, Validators.minLength(2), Validators.maxLength(80)] }),
    icon: new FormControl(this.data.category?.icon ?? '', { nonNullable: true, validators: [Validators.maxLength(40)] }),
  });

  submit(): void {
    if (this.form.invalid) return this.form.markAllAsTouched();
    const { name, icon } = this.form.getRawValue();
    this.ref.close({ name: name.trim(), icon: icon.trim() || undefined });
  }
}
