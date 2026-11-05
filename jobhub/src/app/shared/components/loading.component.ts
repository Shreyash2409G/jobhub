import { Component, input } from '@angular/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-loading',
  imports: [MatProgressSpinnerModule],
  template: `
    <div class="loading" role="status">
      <mat-spinner [diameter]="40" />
      <span class="text-muted">{{ message() }}</span>
    </div>
  `,
  styles: `.loading { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 48px 0; }`,
})
export class LoadingComponent {
  message = input('Loading…');
}
