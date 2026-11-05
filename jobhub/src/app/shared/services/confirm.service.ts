import { Injectable, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Observable, filter, map } from 'rxjs';
import { ConfirmData, ConfirmDialogComponent } from '../components/confirm-dialog.component';

/** confirm.ask({...}).subscribe(() => doTheThing())  runs only when the person presses the confirm button. */
@Injectable({ providedIn: 'root' })
export class ConfirmService {
  private dialog = inject(MatDialog);

  ask(data: ConfirmData): Observable<true> {
    return this.dialog
      .open(ConfirmDialogComponent, { data, width: '420px', maxWidth: '92vw' })
      .afterClosed()
      .pipe(filter((ok): ok is true => ok === true), map(() => true as const));
  }
}
