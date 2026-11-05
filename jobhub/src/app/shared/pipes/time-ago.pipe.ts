import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'timeAgo' })
export class TimeAgoPipe implements PipeTransform {
  transform(value: string | Date): string {
    const days = Math.floor((Date.now() - new Date(value).getTime()) / 86_400_000);
    if (days <= 0) return 'Today';
    if (days === 1) return '1 day ago';
    if (days < 14) return `${days} days ago`;
    return `${Math.floor(days / 7)} weeks ago`;
  }
}
