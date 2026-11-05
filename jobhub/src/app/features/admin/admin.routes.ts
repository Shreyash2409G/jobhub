import { Routes } from '@angular/router';
import { adminGuard } from '../../core/guards/role.guards';
import { AdminLayoutComponent } from './admin-layout.component';

/** The guard sits on the layout route, so every admin page is protected. */
export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    component: AdminLayoutComponent,
    canActivate: [adminGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      { path: 'dashboard', title: 'Admin Dashboard | JobHub', loadComponent: () => import('./dashboard.component').then((m) => m.AdminDashboardComponent) },
      { path: 'users', title: 'Users | JobHub', loadComponent: () => import('./users.component').then((m) => m.AdminUsersComponent) },
      { path: 'recruiters', title: 'Recruiters | JobHub', loadComponent: () => import('./recruiters.component').then((m) => m.AdminRecruitersComponent) },
      { path: 'companies', title: 'Companies | JobHub', loadComponent: () => import('./companies.component').then((m) => m.AdminCompaniesComponent) },
      { path: 'jobs', title: 'Jobs | JobHub', loadComponent: () => import('./jobs.component').then((m) => m.AdminJobsComponent) },
      { path: 'categories', title: 'Categories | JobHub', loadComponent: () => import('./categories.component').then((m) => m.AdminCategoriesComponent) },
      { path: 'reports', title: 'Reports | JobHub', loadComponent: () => import('./reports.component').then((m) => m.AdminReportsComponent) },
    ],
  },
];
