import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-about',
  imports: [RouterLink, MatButtonModule],
  template: `
    <div class="container narrow section">
      <h1>About JobHub</h1>
      <p>JobHub connects job seekers with recruiters through one shared process: search, apply and track.</p>
      <p>Job seekers build a profile, upload a resume and follow every application from Applied to Selected. Recruiters post jobs, review applicants and schedule interviews. Admins keep the platform clean and healthy.</p>
      <p class="text-muted">JobHub is a portfolio project built with Angular, a Flask REST API and MySQL.</p>
      <a mat-flat-button routerLink="/jobs">Browse jobs</a>
    </div>
  `,
  styles: `.narrow { max-width: 720px; }`,
})
export class AboutComponent {}
