import { Injectable, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Job } from '../models';
import { apiMessage } from '../utils/api-error';
import { AuthService } from './auth.service';
import { CandidateService } from './candidate.service';
import { JobService } from './job.service';
import { ToastService } from './toast.service';
import { AuthPromptDialogComponent } from '../../shared/components/auth-prompt-dialog.component';
import { ReportJobDialogComponent } from '../../shared/components/report-job-dialog.component';

/** Save / apply rules. Guests get a login prompt; the data itself lives in CandidateService and the API. */
@Injectable({ providedIn: 'root' })
export class JobActionsService {
  private auth = inject(AuthService);
  private candidate = inject(CandidateService);
  private jobs = inject(JobService);
  private toast = inject(ToastService);
  private dialog = inject(MatDialog);

  isSaved(jobId: number): boolean { return this.candidate.isSaved(jobId); }
  hasApplied(jobId: number): boolean { return this.candidate.hasApplied(jobId); }

  isClosed(job: Job): boolean {
    return job.status === 'Closed' || new Date(job.applicationDeadline) < new Date();
  }

  save(job: Job): void {
    if (!this.canAct('save')) return;
    this.candidate.toggleSave(job).subscribe({
      next: (nowSaved) => (nowSaved ? this.toast.success('Job saved successfully.') : this.toast.info('Job removed from saved jobs.')),
      error: (err) => this.toast.error(apiMessage(err)),
    });
  }

  apply(job: Job): void {
    if (!this.canAct('apply')) return;
    if (this.isClosed(job)) return this.toast.error('This job is closed.');
    if (this.hasApplied(job.id)) return this.toast.error('You have already applied for this job.');
    this.candidate.apply(job).subscribe({
      next: () => this.toast.success('Application submitted successfully.'),
      error: (err) => this.toast.error(apiMessage(err)), // e.g. 409 "You have already applied for this job."
    });
  }

  /** Asks for a reason, then sends the report to the admins. */
  report(job: Job): void {
    if (!this.canAct('report')) return;
    this.dialog
      .open(ReportJobDialogComponent, { data: { jobTitle: job.title }, width: '460px', maxWidth: '94vw' })
      .afterClosed()
      .subscribe((reason?: string) => {
        if (!reason) return;
        this.jobs.reportJob(job.id, reason).subscribe({
          next: () => this.toast.success('Thank you. Our team will review this job.'),
          error: (err) => this.toast.error(apiMessage(err)), // e.g. "You have already reported this job."
        });
      });
  }

  /** Guests see the login prompt; only job seekers may save, apply or report. */
  private canAct(action: 'apply' | 'save' | 'report'): boolean {
    if (!this.auth.isLoggedIn()) {
      this.dialog.open(AuthPromptDialogComponent, { data: { action }, width: '420px', maxWidth: '92vw' });
      return false;
    }
    if (this.auth.role() !== 'candidate') {
      this.toast.info('Only job seekers can apply for, save or report jobs.');
      return false;
    }
    return true;
  }
}
