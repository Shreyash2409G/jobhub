import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { ToastService } from '../services/toast.service';

// Wrong passwords also come back as 401, but that is a form error, not an expired session.
const AUTH_FORM_URLS = ['/auth/login', '/auth/register'];

let lastMessage = '';
let lastShownAt = 0;

/** Several requests can fail at once (for example when the backend is off): show the same toast only once. */
function showOnce(show: (message: string) => void, message: string): void {
  const now = Date.now();
  if (message === lastMessage && now - lastShownAt < 4000) return;
  lastMessage = message;
  lastShownAt = now;
  show(message);
}

/** Central HTTP error handling. Components still get the error and can show a more specific message. */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const toast = inject(ToastService);

  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      const isAuthForm = AUTH_FORM_URLS.some((url) => req.url.endsWith(url));
      if (err.status === 401 && !isAuthForm) {
        if (auth.isLoggedIn()) {
          auth.logout();
          showOnce((m) => toast.error(m), err.error?.message ?? 'Your session has expired. Please login again.');
        }
      } else if (err.status === 0) {
        showOnce((m) => toast.error(m), 'Cannot reach the server. Check that the backend is running.');
      } else if (err.status >= 500) {
        showOnce((m) => toast.error(m), 'Something went wrong on our side. Please try again.');
      }
      return throwError(() => err);
    })
  );
};
