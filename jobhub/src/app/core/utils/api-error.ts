import { HttpErrorResponse } from '@angular/common/http';

/** Turns an HTTP error from the Flask API into one sentence for a toast or a form message. */
export function apiMessage(err: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (!(err instanceof HttpErrorResponse)) return fallback;
  if (err.status === 0) return 'Cannot reach the server. Check that the backend is running.';
  const body = err.error;
  if (body && typeof body === 'object') {
    // Validation errors: {"message": "...", "errors": {"field": "What is wrong."}}
    const first = body.errors ? Object.values(body.errors)[0] : null;
    if (typeof first === 'string') return first;
    if (typeof body.message === 'string') return body.message;
  }
  return fallback;
}
