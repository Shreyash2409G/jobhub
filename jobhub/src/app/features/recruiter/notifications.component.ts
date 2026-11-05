import { Component, inject } from '@angular/core';
import { RecruiterService } from '../../core/services/recruiter.service';
import { NotificationListComponent } from '../../shared/components/notification-list.component';

@Component({
  selector: 'app-recruiter-notifications',
  imports: [NotificationListComponent],
  template: `
    <app-notification-list [items]="recruiter.notifications()" [unread]="recruiter.unreadCount()"
      (read)="recruiter.markRead($event)" (readAll)="recruiter.markAllRead()" />
  `,
})
export class RecruiterNotificationsComponent {
  recruiter = inject(RecruiterService);
}
