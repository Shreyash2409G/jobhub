import { Injectable, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Observable } from 'rxjs';
import { Application } from '../../core/models';
import { RecruiterService } from '../../core/services/recruiter.service';
import { ToastService } from '../../core/services/toast.service';
import { apiMessage } from '../../core/utils/api-error';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog.component';
import { ScheduleInterviewDialogComponent } from './schedule-interview-dialog.component';

/** Applicant actions shared by the applicants list and the applicant details page. */
@Injectable({ providedIn: 'root' })
export class ApplicantActions {
  private recruiter = inject(RecruiterService);
  private dialog = inject(MatDialog);
  private toast = inject(ToastService);

  review(app: Application): void {
    this.run(this.recruiter.setStatus(app.id, 'Under Review'), 'Application marked as under review.');
  }

  shortlist(app: Application): void {
    this.run(this.recruiter.setStatus(app.id, 'Shortlisted'), 'Candidate shortlisted.');
  }

  select(app: Application): void {
    this.confirm('Select this candidate?', `${app.candidate?.name} will be notified that they were selected.`, 'Select', () =>
      this.run(this.recruiter.setStatus(app.id, 'Selected'), 'Candidate selected.')
    );
  }

  reject(app: Application): void {
    this.confirm('Reject this application?', `${app.candidate?.name} will be notified. This cannot be undone.`, 'Reject', () =>
      this.run(this.recruiter.setStatus(app.id, 'Rejected'), 'Application rejected.')
    );
  }

  schedule(app: Application): void {
    this.dialog
      .open(ScheduleInterviewDialogComponent, { data: { candidateName: app.candidate?.name ?? 'Candidate' }, width: '480px', maxWidth: '94vw' })
      .afterClosed()
      .subscribe((value) => {
        if (value) this.run(this.recruiter.scheduleInterview(app.id, value), 'Interview scheduled successfully.');
      });
  }

  private run(request: Observable<unknown>, success: string): void {
    request.subscribe({
      next: () => this.toast.success(success),
      error: (err) => this.toast.error(apiMessage(err)), // the API explains why, e.g. "cannot move to Selected"
    });
  }

  private confirm(title: string, message: string, confirmText: string, action: () => void): void {
    this.dialog
      .open(ConfirmDialogComponent, { data: { title, message, confirmText }, width: '420px', maxWidth: '92vw' })
      .afterClosed()
      .subscribe((ok) => ok && action());
  }
}
