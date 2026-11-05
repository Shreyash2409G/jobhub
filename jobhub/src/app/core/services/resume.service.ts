import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../../environments/environment';
import { ToastService } from './toast.service';

/** Resume downloads need the JWT, so a plain link will not work: fetch the file, then save it. */
@Injectable({ providedIn: 'root' })
export class ResumeService {
  private http = inject(HttpClient);
  private toast = inject(ToastService);

  download(resumeId: number, fileName: string): void {
    this.http.get(`${environment.apiUrl}/resumes/${resumeId}/download`, { responseType: 'blob' }).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        link.click();
        URL.revokeObjectURL(url);
      },
      error: () => this.toast.error('Could not download the resume.'),
    });
  }
}
