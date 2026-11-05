import { Component, computed, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Notification } from '../../core/models';
import { EmptyStateComponent } from './empty-state.component';
import { TimeAgoPipe } from '../pipes/time-ago.pipe';

@Component({
  selector: 'app-notification-list',
  imports: [MatButtonModule, MatIconModule, EmptyStateComponent, TimeAgoPipe],
  template: `
    <div class="row head">
      <h1>Notifications</h1>
      @if (unread() > 0) { <button mat-stroked-button (click)="readAll.emit()">Mark all as read</button> }
    </div>
    @if (sorted().length) {
      <div class="card list">
        @for (n of sorted(); track n.id) {
          <button type="button" class="item" [class.unread]="!n.isRead" (click)="read.emit(n.id)">
            <mat-icon>{{ icons[n.type] }}</mat-icon>
            <span class="msg">{{ n.message }}<small class="text-muted">{{ n.createdAt | timeAgo }}</small></span>
            @if (!n.isRead) { <span class="dot" aria-label="Unread"></span> }
          </button>
        }
      </div>
    } @else {
      <div class="card"><app-empty-state icon="notifications_none" title="You are all caught up" message="Updates will appear here." /></div>
    }
  `,
  styles: `
    .head { justify-content: space-between; }
    .list { padding: 0; }
    .item { display: flex; align-items: center; gap: 14px; width: 100%; padding: 16px 20px; border: 0; border-bottom: 1px solid var(--jh-border);
            background: none; font: inherit; color: inherit; text-align: left; cursor: pointer; }
    .item:last-child { border-bottom: 0; }
    .item:hover { background: var(--jh-bg); }
    .item.unread { background: var(--jh-primary-soft); }
    .item mat-icon { color: var(--jh-primary); }
    .msg { flex: 1; display: flex; flex-direction: column; }
    .dot { width: 10px; height: 10px; border-radius: 50%; background: var(--jh-accent); }
  `,
})
export class NotificationListComponent {
  items = input.required<Notification[]>();
  unread = input(0);
  read = output<number>();
  readAll = output<void>();

  icons = { application: 'work', interview: 'event', system: 'info' };
  sorted = computed(() => [...this.items()].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)));
}
