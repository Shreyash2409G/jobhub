import { Routes } from '@angular/router';
import { recruiterGuard } from '../../core/guards/role.guards';
import { RecruiterLayoutComponent } from './recruiter-layout.component';

/** The guard sits on the layout route, so every recruiter page is protected. */
export const RECRUITER_ROUTES: Routes = [
  {
    path: '',
    component: RecruiterLayoutComponent,
    canActivate: [recruiterGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      { path: 'dashboard', title: 'Recruiter Dashboard | JobHub', loadComponent: () => import('./dashboard.component').then((m) => m.RecruiterDashboardComponent) },
      { path: 'company', title: 'Company Profile | JobHub', loadComponent: () => import('./company.component').then((m) => m.CompanyProfileComponent) },
      { path: 'jobs', title: 'My Jobs | JobHub', loadComponent: () => import('./jobs.component').then((m) => m.MyJobsComponent) },
      { path: 'jobs/create', title: 'Post a Job | JobHub', loadComponent: () => import('./job-form.component').then((m) => m.JobFormComponent) },
      { path: 'jobs/:id/edit', title: 'Edit Job | JobHub', loadComponent: () => import('./job-form.component').then((m) => m.JobFormComponent) },
      { path: 'jobs/:id/applicants', title: 'Applicants | JobHub', loadComponent: () => import('./applicants.component').then((m) => m.ApplicantsComponent) },
      { path: 'applicants/:id', title: 'Applicant | JobHub', loadComponent: () => import('./applicant-details.component').then((m) => m.ApplicantDetailsComponent) },
      { path: 'interviews', title: 'Interviews | JobHub', loadComponent: () => import('./interviews.component').then((m) => m.RecruiterInterviewsComponent) },
      { path: 'notifications', title: 'Notifications | JobHub', loadComponent: () => import('./notifications.component').then((m) => m.RecruiterNotificationsComponent) },
    ],
  },
];
