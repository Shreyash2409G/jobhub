import { Component, computed, input } from '@angular/core';

const COLORS = ['#0f766e', '#2f5d9e', '#8a5a1f', '#6b4fb0', '#a23b5f', '#2f7a4d', '#9c4a1a'];

/** Initials avatar. Replaced by the real logo image once companies upload one. */
@Component({
  selector: 'app-company-logo',
  template: `<span class="logo" [style.background]="bg()" [style.width.px]="size()" [style.height.px]="size()"
                   [style.font-size.px]="size() * 0.38" aria-hidden="true">{{ initials() }}</span>`,
  styles: `.logo { display: inline-flex; align-items: center; justify-content: center; border-radius: 12px; color: #fff; font-weight: 700; flex-shrink: 0; }`,
})
export class CompanyLogoComponent {
  name = input.required<string>();
  size = input(48);
  initials = computed(() => this.name().split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase());
  bg = computed(() => COLORS[[...this.name()].reduce((n, c) => n + c.charCodeAt(0), 0) % COLORS.length]);
}
