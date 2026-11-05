import { Component, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

/** Used for empty lists, no-results and error states. Project an action button inside it. */
@Component({
  selector: 'app-empty-state',
  imports: [MatIconModule],
  template: `
    <div class="empty">
      <mat-icon>{{ icon() }}</mat-icon>
      <h3>{{ title() }}</h3>
      @if (message()) { <p class="text-muted">{{ message() }}</p> }
      <ng-content />
    </div>
  `,
  styles: `
    .empty { text-align: center; padding: 56px 16px; }
    .empty mat-icon { font-size: 48px; width: 48px; height: 48px; color: var(--jh-muted); margin-bottom: 8px; }
    .empty p { max-width: 420px; margin: 0 auto 16px; }
  `,
})
export class EmptyStateComponent {
  icon = input('search_off');
  title = input.required<string>();
  message = input('');
}
