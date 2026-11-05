import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { EmptyStateComponent } from './empty-state.component';

/**
 * TEMPORARY page used for every route until its real screen is built.
 * Title and phase come from the route's `data` (bound via withComponentInputBinding).
 */
@Component({
  selector: 'app-placeholder',
  imports: [RouterLink, MatButtonModule, EmptyStateComponent],
  template: `
    <div class="container section">
      <h1>{{ pageTitle() }}</h1>
      <div class="card">
        <app-empty-state icon="construction" title="This page is not built yet"
          [message]="'Planned for ' + phase() + '. The route and its access rules already work.'">
          <a mat-flat-button routerLink="/">Back to home</a>
        </app-empty-state>
      </div>
    </div>
  `,
})
export class PlaceholderComponent {
  pageTitle = input('Page');
  phase = input('a later phase');
}
