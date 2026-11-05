import { Component, inject } from '@angular/core';
import { CandidateService } from '../../core/services/candidate.service';
import { NotificationListComponent } from '../../shared/components/notification-list.component';

@Component({
  selector: 'app-notifications',
  imports: [NotificationListComponent],
  template: `
    <app-notification-list [items]="candidate.notifications()" [unread]="candidate.unreadCount()"
      (read)="candidate.markRead($event)" (readAll)="candidate.markAllRead()" />
  `,
})
export class NotificationsComponent {
  candidate = inject(CandidateService);
}
