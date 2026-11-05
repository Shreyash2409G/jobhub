import { Routes } from '@angular/router';
import { guestGuard } from './core/guards/role.guards';
import { PlaceholderComponent } from './shared/components/placeholder.component';

const page = (pageTitle: string, phase: string) => ({
  component: PlaceholderComponent,
  title: `${pageTitle} | JobHub`,
  data: { pageTitle, phase },
});

export const routes: Routes = [
  // ---------- Public (each page is lazy-loaded) ----------
  { path: '', pathMatch: 'full', title: 'JobHub | Find your next opportunity',
    loadComponent: () => import('./features/public/home.component').then((m) => m.HomeComponent) },
  { path: 'jobs', title: 'Jobs | JobHub',
    loadComponent: () => import('./features/public/jobs.component').then((m) => m.JobsComponent) },
  { path: 'jobs/:id', title: 'Job Details | JobHub',
    loadComponent: () => import('./features/public/job-details.component').then((m) => m.JobDetailsComponent) },
  { path: 'companies', title: 'Companies | JobHub',
    loadComponent: () => import('./features/public/companies.component').then((m) => m.CompaniesComponent) },
  { path: 'companies/:id', title: 'Company | JobHub',
    loadComponent: () => import('./features/public/company-details.component').then((m) => m.CompanyDetailsComponent) },
  { path: 'login', title: 'Login | JobHub', canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/login.component').then((m) => m.LoginComponent) },
  { path: 'register', title: 'Register | JobHub', canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/register.component').then((m) => m.RegisterComponent) },
  { path: 'about', title: 'About | JobHub',
    loadComponent: () => import('./features/public/about.component').then((m) => m.AboutComponent) },
  { path: 'contact', title: 'Contact | JobHub',
    loadComponent: () => import('./features/public/contact.component').then((m) => m.ContactComponent) },

  // ---------- Lazy-loaded role areas ----------
  {
    path: 'recruiter',
    loadChildren: () => import('./features/recruiter/recruiter.routes').then((m) => m.RECRUITER_ROUTES),
  },
  {
    path: 'admin',
    loadChildren: () => import('./features/admin/admin.routes').then((m) => m.ADMIN_ROUTES),
  },
  // Candidate pages live at the root (/dashboard, /profile ...), so list them before the wildcard.
  {
    path: '',
    loadChildren: () => import('./features/candidate/candidate.routes').then((m) => m.CANDIDATE_ROUTES),
  },

  { path: '**', ...page('Page not found', 'n/a') },
];
