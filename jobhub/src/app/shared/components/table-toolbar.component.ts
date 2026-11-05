import { Component, input, output } from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

export interface FilterOption { value: string; label: string; }

/** Search box plus an optional filter dropdown, used above every admin table. */
@Component({
  selector: 'app-table-toolbar',
  imports: [MatFormFieldModule, MatIconModule, MatInputModule, MatSelectModule],
  template: `
    <div class="row bar">
      @if (placeholder()) {
        <mat-form-field appearance="outline" subscriptSizing="dynamic" class="grow">
          <mat-label>{{ placeholder() }}</mat-label>
          <mat-icon matPrefix>search</mat-icon>
          <input matInput [value]="term()" (input)="search.emit($any($event.target).value)">
        </mat-form-field>
      }
      @if (options().length) {
        <mat-form-field appearance="outline" subscriptSizing="dynamic" class="filter">
          <mat-label>{{ filterLabel() }}</mat-label>
          <mat-select [value]="filter()" (selectionChange)="filterChange.emit($event.value)">
            @for (o of options(); track o.value) { <mat-option [value]="o.value">{{ o.label }}</mat-option> }
          </mat-select>
        </mat-form-field>
      }
    </div>
  `,
  styles: `.bar { margin-bottom: 16px; gap: 12px; } .grow { flex: 1; min-width: 220px; } .filter { width: 190px; }`,
})
export class TableToolbarComponent {
  placeholder = input('');
  term = input('');
  filterLabel = input('Filter');
  options = input<FilterOption[]>([]);
  filter = input('');
  search = output<string>();
  filterChange = output<string>();
}
