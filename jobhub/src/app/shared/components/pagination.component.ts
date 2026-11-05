import { Component, computed, input, output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-pagination',
  imports: [MatIconModule],
  template: `
    @if (totalPages() > 1) {
      <nav class="pager" aria-label="Pagination">
        <button type="button" class="pg" (click)="go(page() - 1)" [disabled]="page() === 1" aria-label="Previous page">
          <mat-icon>chevron_left</mat-icon>
        </button>
        @for (item of items(); track $index) {
          @if (item === null) {
            <span class="gap">…</span>
          } @else {
            <button type="button" class="pg" [class.active]="item === page()" (click)="go(item)"
                    [attr.aria-current]="item === page() ? 'page' : null">{{ item }}</button>
          }
        }
        <button type="button" class="pg" (click)="go(page() + 1)" [disabled]="page() === totalPages()" aria-label="Next page">
          <mat-icon>chevron_right</mat-icon>
        </button>
      </nav>
    }
  `,
  styles: `
    .pager { display: flex; justify-content: center; align-items: center; gap: 6px; margin: 32px 0 8px; flex-wrap: wrap; }
    .pg { min-width: 40px; height: 40px; padding: 0 10px; border-radius: var(--jh-radius-sm); border: 1px solid var(--jh-border);
          background: var(--jh-surface); color: var(--jh-ink); font: inherit; font-weight: 600; cursor: pointer;
          display: inline-flex; align-items: center; justify-content: center; }
    .pg:hover:not(:disabled) { border-color: var(--jh-primary); }
    .pg:disabled { opacity: 0.4; cursor: default; }
    .pg.active { background: var(--jh-primary); border-color: var(--jh-primary); color: #fff; }
    .gap { padding: 0 4px; color: var(--jh-muted); }
  `,
})
export class PaginationComponent {
  page = input.required<number>();
  total = input.required<number>();
  pageSize = input(6);
  pageChange = output<number>();

  totalPages = computed(() => Math.max(1, Math.ceil(this.total() / this.pageSize())));

  /** Page numbers with null marking a gap, e.g. 1 … 4 5 6 … 12 */
  items = computed<(number | null)[]>(() => {
    const last = this.totalPages();
    const current = this.page();
    const wanted = [...new Set([1, last, current - 1, current, current + 1])]
      .filter((n) => n >= 1 && n <= last)
      .sort((a, b) => a - b);
    const result: (number | null)[] = [];
    wanted.forEach((n, i) => {
      if (i > 0 && n - wanted[i - 1] > 1) result.push(null);
      result.push(n);
    });
    return result;
  });

  go(target: number): void {
    if (target >= 1 && target <= this.totalPages() && target !== this.page()) this.pageChange.emit(target);
  }
}
