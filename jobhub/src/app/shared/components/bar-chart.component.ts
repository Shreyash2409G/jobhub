import { Component, computed, input } from '@angular/core';

export interface ChartItem { label: string; value: number; }

/**
 * A small bar chart drawn with plain HTML and CSS (no chart library to install).
 * "horizontal" suits long labels (funnel, categories); "vertical" suits a timeline (applications per day).
 */
@Component({
  selector: 'app-bar-chart',
  template: `
    <div class="chart" [class.vertical]="orientation() === 'vertical'" role="img" [attr.aria-label]="summary()">
      @for (item of items(); track item.label) {
        <div class="bar" [title]="item.label + ': ' + item.value">
          @if (orientation() === 'horizontal') {
            <span class="label">{{ item.label }}</span>
            <span class="track"><span class="fill" [style.width.%]="percent(item.value)"></span></span>
            <span class="value">{{ item.value }}@if (showShare()) { <small>({{ share(item.value) }}%)</small> }</span>
          } @else {
            <span class="value">{{ item.value }}</span>
            <span class="column"><span class="fill" [style.height.%]="percent(item.value)"></span></span>
            <span class="label">{{ item.label }}</span>
          }
        </div>
      }
    </div>
  `,
  styles: `
    .chart { display: flex; flex-direction: column; gap: 10px; }
    .bar { display: grid; grid-template-columns: 150px 1fr 70px; align-items: center; gap: 10px; font-size: 0.9rem; }
    .label { color: var(--jh-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .value { font-weight: 700; text-align: right; } .value small { font-weight: 400; color: var(--jh-muted); margin-left: 4px; }
    .track { height: 14px; background: var(--jh-bg); border-radius: 999px; overflow: hidden; }
    .fill { display: block; background: var(--jh-primary); border-radius: 999px; min-width: 2px; height: 100%; width: 100%; transition: width 0.3s; }

    .chart.vertical { flex-direction: row; align-items: flex-end; gap: 6px; height: 190px; }
    .vertical .bar { flex: 1; min-width: 0; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; gap: 4px; height: 100%; }
    .vertical .column { flex: 1; width: 100%; max-width: 28px; display: flex; align-items: flex-end; background: var(--jh-bg); border-radius: 6px 6px 0 0; overflow: hidden; }
    .vertical .fill { width: 100%; border-radius: 6px 6px 0 0; transition: height 0.3s; }
    .vertical .value { font-size: 0.75rem; } .vertical .label { font-size: 0.7rem; }
    @media (max-width: 560px) { .bar { grid-template-columns: 110px 1fr 60px; } }
  `,
})
export class BarChartComponent {
  items = input.required<ChartItem[]>();
  orientation = input<'horizontal' | 'vertical'>('horizontal');
  /** Also show each value as a percentage of the first bar (used for the funnel). */
  showShare = input(false);

  private max = computed(() => Math.max(1, ...this.items().map((i) => i.value)));
  summary = computed(() => this.items().map((i) => `${i.label} ${i.value}`).join(', '));

  /** Height or width of a bar. A zero stays empty, anything else gets at least a sliver. */
  percent(value: number): number { return value === 0 ? 0 : Math.max(3, (value / this.max()) * 100); }
  share(value: number): number { const first = this.items()[0]?.value || 0; return first ? Math.round((value / first) * 100) : 0; }
}
