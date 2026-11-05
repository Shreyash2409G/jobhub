import { Component, input, output } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { Category } from '../../core/models';
import { EXPERIENCE_BANDS, JOB_TYPES, SALARY_OPTIONS, WORK_MODES } from '../../core/models/job-options';
import { LOCATIONS } from '../../core/constants/lookups';
import { JobFilterForm } from './job-filter.config';

/**
 * Presentational filter panel. The parent owns the form (so it can sync it with the URL);
 * this component only renders the controls and emits "clear".
 */
@Component({
  selector: 'app-job-filter',
  imports: [ReactiveFormsModule, MatButtonModule, MatCheckboxModule, MatFormFieldModule, MatSelectModule],
  template: `
    <form [formGroup]="form()" (submit)="$event.preventDefault()">
      <div class="head">
        <h2>Filters</h2>
        <button mat-button type="button" (click)="clear.emit()" [disabled]="!hasActive()">Clear all</button>
      </div>

      <mat-form-field appearance="outline" subscriptSizing="dynamic">
        <mat-label>Location</mat-label>
        <mat-select formControlName="location">
          <mat-option value="">All locations</mat-option>
          @for (loc of locations; track loc) { <mat-option [value]="loc">{{ loc }}</mat-option> }
        </mat-select>
      </mat-form-field>

      <mat-form-field appearance="outline" subscriptSizing="dynamic">
        <mat-label>Category</mat-label>
        <mat-select formControlName="category">
          <mat-option value="">All categories</mat-option>
          @for (c of categories(); track c.id) { <mat-option [value]="'' + c.id">{{ c.name }}</mat-option> }
        </mat-select>
      </mat-form-field>

      @for (f of facets; track f.key) {
        <fieldset [formGroupName]="f.key">
          <legend>{{ f.label }}</legend>
          @for (option of f.options; track option) {
            <mat-checkbox [formControlName]="option">{{ option }}</mat-checkbox>
          }
        </fieldset>
      }
    </form>
  `,
  styles: `
    .head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
    .head h2 { margin: 0; font-size: 1.1rem; }
    mat-form-field { margin-bottom: 12px; }
    fieldset { border: 0; border-top: 1px solid var(--jh-border); margin: 8px 0 0; padding: 12px 0 0; }
    legend { font-weight: 600; padding: 0 8px 0 0; font-size: 0.95rem; }
    mat-checkbox { display: block; }
  `,
})
export class JobFilterComponent {
  form = input.required<JobFilterForm>();
  categories = input<Category[]>([]);
  hasActive = input(false);
  clear = output<void>();

  locations = LOCATIONS;
  facets = [
    { key: 'jobType', label: 'Job type', options: JOB_TYPES },
    { key: 'experience', label: 'Experience', options: EXPERIENCE_BANDS },
    { key: 'salary', label: 'Salary', options: SALARY_OPTIONS },
    { key: 'workMode', label: 'Work mode', options: WORK_MODES },
  ];
}
