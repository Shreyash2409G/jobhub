import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { CandidateService } from '../../core/services/candidate.service';
import { ResumeService } from '../../core/services/resume.service';
import { ToastService } from '../../core/services/toast.service';
import { apiMessage } from '../../core/utils/api-error';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog.component';

const ALLOWED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];
const MAX_BYTES = 2 * 1024 * 1024;

@Component({
  selector: 'app-resume',
  imports: [DatePipe, MatButtonModule, MatIconModule],
  template: `
    <h1>My resume</h1>
    <div class="stack">
      @if (candidate.resume(); as resume) {
        <section class="card file">
          <mat-icon>description</mat-icon>
          <div class="info">
            <strong>{{ resume.fileName }}</strong>
            <span class="text-muted">{{ resume.fileSizeKb }} KB · Uploaded {{ resume.uploadedAt | date: 'd MMM y' }}</span>
          </div>
          <button mat-stroked-button type="button" (click)="download()">Download</button>
          <button mat-stroked-button type="button" (click)="picker.click()">Replace</button>
          <button mat-button type="button" (click)="remove()">Remove</button>
        </section>
      }

      <section class="card drop" [class.over]="dragging()"
               (dragover)="$event.preventDefault(); dragging.set(true)" (dragleave)="dragging.set(false)" (drop)="onDrop($event)">
        <mat-icon>upload_file</mat-icon>
        <h3>{{ candidate.resume() ? 'Upload a new resume' : 'Upload your resume' }}</h3>
        <p class="text-muted">Drag a file here or choose one. PDF, DOC or DOCX, up to 2 MB.</p>
        <button mat-flat-button type="button" (click)="picker.click()">Choose file</button>
        <input #picker type="file" hidden accept=".pdf,.doc,.docx" (change)="onPick($event)">
        @if (error()) { <p class="form-error" role="alert">{{ error() }}</p> }
      </section>
    </div>
  `,
  styles: `
    .file { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
    .file > mat-icon { color: var(--jh-primary); font-size: 36px; width: 36px; height: 36px; }
    .info { flex: 1; display: flex; flex-direction: column; min-width: 180px; }
    .drop { text-align: center; border-style: dashed; padding: 40px 24px; }
    .drop.over { border-color: var(--jh-primary); background: var(--jh-primary-soft); }
    .drop > mat-icon { font-size: 40px; width: 40px; height: 40px; color: var(--jh-muted); }
  `,
})
export class ResumeComponent {
  candidate = inject(CandidateService);
  private toast = inject(ToastService);
  private dialog = inject(MatDialog);
  private resumes = inject(ResumeService);

  dragging = signal(false);
  error = signal('');

  onPick(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.accept(input.files?.[0]);
    input.value = ''; // allow picking the same file again
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragging.set(false);
    this.accept(event.dataTransfer?.files?.[0]);
  }

  /** Quick checks for a fast error message. The API checks type, file signature and size again. */
  private accept(file?: File): void {
    if (!file) return;
    if (!ALLOWED_TYPES.includes(file.type)) return this.error.set('Only PDF, DOC or DOCX files are allowed.');
    if (file.size > MAX_BYTES) return this.error.set('The file is larger than 2 MB.');
    this.error.set('');
    this.candidate.uploadResume(file).subscribe({
      next: () => this.toast.success('Resume uploaded successfully.'),
      error: (err) => this.error.set(apiMessage(err)),
    });
  }

  download(): void {
    const resume = this.candidate.resume();
    if (resume) this.resumes.download(resume.id, resume.fileName);
  }

  remove(): void {
    this.dialog
      .open(ConfirmDialogComponent, {
        width: '420px', maxWidth: '92vw',
        data: { title: 'Remove resume?', message: 'Recruiters will not be able to see it on your future applications.', confirmText: 'Remove' },
      })
      .afterClosed()
      .subscribe((ok) => {
        if (!ok) return;
        this.candidate.removeResume().subscribe({
          next: () => this.toast.success('Resume removed.'),
          error: (err) => this.toast.error(apiMessage(err)),
        });
      });
  }
}
