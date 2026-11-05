import { HttpErrorResponse } from '@angular/common/http';
import { apiMessage } from './api-error';

describe('apiMessage', () => {
  it('shows the first field error of a validation response', () => {
    const error = new HttpErrorResponse({
      status: 400,
      error: { message: 'Please fix the highlighted fields.', errors: { email: 'Enter a valid email address.' } },
    });
    expect(apiMessage(error)).toBe('Enter a valid email address.');
  });

  it('uses the message when there are no field errors', () => {
    const error = new HttpErrorResponse({ status: 409, error: { message: 'You have already applied for this job.' } });
    expect(apiMessage(error)).toBe('You have already applied for this job.');
  });

  it('explains a network failure', () => {
    expect(apiMessage(new HttpErrorResponse({ status: 0 }))).toContain('backend');
  });

  it('falls back to a general sentence (or the one you give)', () => {
    expect(apiMessage(new Error('boom'))).toBe('Something went wrong. Please try again.');
    expect(apiMessage(new Error('boom'), 'Custom')).toBe('Custom');
  });
});
