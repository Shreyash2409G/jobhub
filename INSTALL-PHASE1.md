# JobHub Phase 1: how to apply

1. Create the project (skip if you already did):
       ng new jobhub --routing --style=scss --ssr=false
       cd jobhub
       ng add @angular/material      # pick any theme; the styles.scss in this zip replaces it

2. Delete the files the CLI generated that this zip replaces:
   - Angular 20+: src/app/app.ts, app.html, app.scss, app.spec.ts
   - Older: src/app/app.component.* (spec/html/css)
   - app.config.ts, app.routes.ts, main.ts, index.html, styles.scss get overwritten

3. Copy this zip's `src/` folder into your project's `src/` (merge, overwrite when asked).

4. Run `ng build`, then `ng serve` and open http://localhost:4200

Requires Angular Material 19.2 or newer (styles.scss uses the mat.theme mixin).

## Testing the guards
Click "Demo" in the navbar and enter as each role. While logged in as a Job Seeker,
type /admin/dashboard in the address bar: you should land on /dashboard with a toast.
Logged out, any protected URL redirects to /login?returnUrl=...

## Notes
- Every page is still a PlaceholderComponent fed by route data. Real pages replace them phase by phase.
- The "Demo" menu and AuthService.demoLogin() are dev-only and get removed in Phase 7.
- Candidate pages (/dashboard, /profile ...) sit at the root, so each carries its own guard.
- NOT build-verified: this sandbox has no network, so I could not run ng build. Paste any errors back to me.
