import { Routes } from '@angular/router';
import { candidateGuard } from '../../core/guards/role.guards';
import { CandidateLayoutComponent } from './candidate-layout.component';

/**
 * Mounted at the root. The guard sits on the layout route, so every page below is protected.
 * Unknown URLs never match here and fall through to the 404 route.
 */
export const CANDIDATE_ROUTES: Routes = [
  {
    path: '',
    component: CandidateLayoutComponent,
    canActivate: [candidateGuard],
    children: [
      { path: 'dashboard', title: 'Dashboard | JobHub', loadComponent: () => import('./dashboard.component').then((m) => m.DashboardComponent) },
      { path: 'profile', title: 'My Profile | JobHub', loadComponent: () => import('./profile.component').then((m) => m.ProfileComponent) },
      { path: 'resume', title: 'My Resume | JobHub', loadComponent: () => import('./resume.component').then((m) => m.ResumeComponent) },
      { path: 'saved-jobs', title: 'Saved Jobs | JobHub', loadComponent: () => import('./saved-jobs.component').then((m) => m.SavedJobsComponent) },
      { path: 'applied-jobs', title: 'Applied Jobs | JobHub', loadComponent: () => import('./applied-jobs.component').then((m) => m.AppliedJobsComponent) },
      { path: 'applications/:id', title: 'Application | JobHub', loadComponent: () => import('./application-details.component').then((m) => m.ApplicationDetailsComponent) },
      { path: 'interviews', title: 'Interviews | JobHub', loadComponent: () => import('./interviews.component').then((m) => m.InterviewsComponent) },
      { path: 'notifications', title: 'Notifications | JobHub', loadComponent: () => import('./notifications.component').then((m) => m.NotificationsComponent) },
      { path: 'settings', title: 'Settings | JobHub', loadComponent: () => import('./settings.component').then((m) => m.SettingsComponent) },
    ],
  },
];
