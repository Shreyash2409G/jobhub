import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { ToastService } from '../services/toast.service';
import { UserRole } from '../models';

/** Builds a guard that only lets one role through. All role logic lives here. */
function roleGuard(required: UserRole): CanActivateFn {
  return (_route, state) => {
    const auth = inject(AuthService);
    const router = inject(Router);
    const toast = inject(ToastService);

    const role = auth.role();
    if (!role) {
      toast.info('Please login to continue.');
      return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
    }
    if (role !== required) {
      toast.error('You do not have access to that page.');
      return router.parseUrl(auth.homeRoute(role)); // send them to their own dashboard
    }
    return true;
  };
}

/** /login and /register make no sense when you are already logged in: go to your own dashboard instead. */
export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const role = auth.role();
  return role ? inject(Router).parseUrl(auth.homeRoute(role)) : true;
};

export const candidateGuard = roleGuard('candidate');
export const recruiterGuard = roleGuard('recruiter');
export const adminGuard = roleGuard('admin');
