import { Component, computed, inject, signal } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { catchError, combineLatest, debounceTime, map, of, switchMap, tap } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { JobService } from '../../core/services/job.service';
import { SORT_OPTIONS } from '../../core/models/job-options';
import { JobCardComponent } from '../../shared/components/job-card.component';
import { JobFilterComponent } from '../../shared/components/job-filter.component';
import { PaginationComponent } from '../../shared/components/pagination.component';
import { LoadingComponent } from '../../shared/components/loading.component';
import { EmptyStateComponent } from '../../shared/components/empty-state.component';
import { createJobFilterForm, formToQuery, paramsToFormValue, parseQuery } from '../../shared/components/job-filter.config';

/**
 * Data flow (the URL is the single source of truth, so links, refresh and the back button all work):
 *   form changes --debounce--> URL query params --> parseQuery --> JobService.getJobs (switchMap)
 *   URL changes (back button, navbar link) --> form.patchValue (no event, so no loop)
 */
@Component({
  selector: 'app-jobs',
  imports: [ReactiveFormsModule, MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule, MatSelectModule,
    JobCardComponent, JobFilterComponent, PaginationComponent, LoadingComponent, EmptyStateComponent],
  template: `
    <div class="container jobs">
      <div class="page-header"><h1>Browse jobs</h1></div>

      <div class="card searchbar">
        <mat-form-field appearance="outline" subscriptSizing="dynamic">
          <mat-label>Job title or skills</mat-label>
          <mat-icon matPrefix>search</mat-icon>
          <input matInput [formControl]="form.controls.keyword" placeholder="e.g. Angular, Python, Data Analyst">
          @if (form.controls.keyword.value) {
            <button matSuffix mat-icon-button type="button" aria-label="Clear search" (click)="form.controls.keyword.setValue('')">
              <mat-icon>close</mat-icon>
            </button>
          }
        </mat-form-field>
        <button mat-stroked-button type="button" class="filters-btn" (click)="drawerOpen.set(true)">
          <mat-icon>tune</mat-icon> Filters{{ activeCount() ? ' (' + activeCount() + ')' : '' }}
        </button>
      </div>

      <div class="layout">
        <div class="filters-wrap" [class.open]="drawerOpen()">
          <div class="scrim" (click)="drawerOpen.set(false)"></div>
          <div class="sheet">
            <div class="sheet__head">
              <strong>Filters</strong>
              <button mat-icon-button type="button" aria-label="Close filters" (click)="drawerOpen.set(false)"><mat-icon>close</mat-icon></button>
            </div>
            <div class="sheet__body card">
              <app-job-filter [form]="form" [categories]="categories()" [hasActive]="hasActive()" (clear)="clearAll()" />
            </div>
            <div class="sheet__foot">
              <button mat-flat-button type="button" (click)="drawerOpen.set(false)">
                Show {{ result()?.total ?? '' }} jobs
              </button>
            </div>
          </div>
        </div>

        <section id="results" class="results">
          <div class="results__head">
            <p class="count" aria-live="polite">
              @if (result(); as res) { <strong>{{ res.total }}</strong> {{ res.total === 1 ? 'job' : 'jobs' }} found }
              @if (hasActive()) { <button mat-button type="button" (click)="clearAll()">Clear filters</button> }
            </p>
            <mat-form-field appearance="outline" subscriptSizing="dynamic" class="sort">
              <mat-label>Sort by</mat-label>
              <mat-select [formControl]="form.controls.sort">
                @for (o of sortOptions; track o.value) { <mat-option [value]="o.value">{{ o.label }}</mat-option> }
              </mat-select>
            </mat-form-field>
          </div>

          @if (loading()) {
            <app-loading message="Finding jobs…" />
          } @else if (error()) {
            <div class="card">
              <app-empty-state icon="cloud_off" title="Could not load jobs" message="Something went wrong. Please try again.">
                <button mat-flat-button type="button" (click)="reload.update(n => n + 1)">Try again</button>
              </app-empty-state>
            </div>
          } @else if (result(); as res) {
            @if (res.items.length) {
              <div class="grid">@for (job of res.items; track job.id) { <app-job-card [job]="job" /> }</div>
              <app-pagination [page]="currentPage()" [total]="res.total" [pageSize]="pageSize" (pageChange)="goToPage($event)" />
            } @else {
              <div class="card">
                <app-empty-state title="No jobs match your filters"
                  message="Try removing a filter or searching with different keywords.">
                  <button mat-flat-button type="button" (click)="clearAll()">Clear filters</button>
                </app-empty-state>
              </div>
            }
          }
        </section>
      </div>
    </div>
  `,
  styles: `
    .jobs { padding-bottom: 64px; }
    .searchbar { display: flex; gap: 12px; align-items: center; padding: 16px; margin-bottom: 24px; }
    .searchbar mat-form-field { flex: 1; }
    .filters-btn { display: none; height: 56px; }
    .layout { display: grid; grid-template-columns: 290px 1fr; gap: 24px; align-items: start; }
    .filters-wrap { position: sticky; top: 92px; max-height: calc(100vh - 110px); overflow-y: auto; }
    .scrim, .sheet__head, .sheet__foot { display: none; }
    .results { scroll-margin-top: 90px; min-width: 0; }
    .results__head { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; margin-bottom: 16px; }
    .count { margin: 0; }
    .sort { width: 220px; }
    .grid { grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); }

    @media (max-width: 900px) {
      .filters-btn { display: inline-flex; align-items: center; }
      .layout { grid-template-columns: 1fr; }
      .filters-wrap { display: none; position: fixed; inset: 0; z-index: 100; max-height: none; overflow: visible; }
      .filters-wrap.open { display: block; }
      .scrim { display: block; position: absolute; inset: 0; background: rgba(16, 36, 43, 0.5); }
      .sheet { position: absolute; top: 0; bottom: 0; left: 0; width: min(380px, 92vw); background: var(--jh-bg);
               display: flex; flex-direction: column; }
      .sheet__head { display: flex; justify-content: space-between; align-items: center; padding: 8px 8px 8px 20px;
                     background: var(--jh-surface); border-bottom: 1px solid var(--jh-border); }
      .sheet__body { flex: 1; overflow-y: auto; border-radius: 0; border: 0; box-shadow: none; }
      .sheet__foot { display: block; padding: 12px 16px; background: var(--jh-surface); border-top: 1px solid var(--jh-border); }
      .sheet__foot button { width: 100%; height: 48px; }
    }
    @media (max-width: 600px) { .sort { width: 100%; } .grid { grid-template-columns: 1fr; } }
  `,
})
export class JobsComponent {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private jobService = inject(JobService);

  readonly pageSize = 6;
  readonly sortOptions = SORT_OPTIONS;

  form = createJobFilterForm();
  drawerOpen = signal(false);
  loading = signal(true);
  error = signal(false);
  reload = signal(0);

  categories = toSignal(this.jobService.getCategories(), { initialValue: [] });

  private query$ = this.route.queryParamMap.pipe(map(parseQuery));
  params = toSignal(this.query$, { initialValue: parseQuery(this.route.snapshot.queryParamMap) });

  // switchMap cancels the previous request when the filters change again
  result = toSignal(
    combineLatest([this.query$, toObservable(this.reload)]).pipe(
      tap(() => { this.loading.set(true); this.error.set(false); }),
      switchMap(([q]) =>
        this.jobService.getJobs({ ...q, limit: this.pageSize }).pipe(
          catchError(() => { this.error.set(true); return of(null); })
        )
      ),
      tap(() => this.loading.set(false))
    ),
    { initialValue: null }
  );

  currentPage = computed(() => {
    const last = Math.max(1, Math.ceil((this.result()?.total ?? 0) / this.pageSize));
    return Math.min(this.params().page, last);
  });

  activeCount = computed(() => {
    const p = this.params();
    return (p.location ? 1 : 0) + (p.category ? 1 : 0) + p.jobType.length + p.experience.length + p.salary.length + p.workMode.length;
  });
  hasActive = computed(() => this.activeCount() > 0 || !!this.params().keyword);

  constructor() {
    // URL -> form (no events, so this cannot trigger the form -> URL subscription below)
    this.query$.pipe(takeUntilDestroyed()).subscribe((p) => {
      const value = paramsToFormValue(p);
      const typed = this.form.controls.keyword.value;
      if (typed.trim() === value.keyword) value.keyword = typed; // do not eat spaces while typing
      this.form.patchValue(value, { emitEvent: false });
    });

    // form -> URL, debounced so typing does not fire a request per keystroke
    this.form.valueChanges.pipe(debounceTime(350), takeUntilDestroyed()).subscribe(() => {
      const next = formToQuery(this.form.getRawValue());
      const current = formToQuery(paramsToFormValue(this.params()));
      if (JSON.stringify(next) !== JSON.stringify(current)) {
        this.router.navigate([], { relativeTo: this.route, queryParams: next });
      }
    });
  }

  goToPage(page: number): void {
    this.router
      .navigate([], { relativeTo: this.route, queryParams: { page: page > 1 ? page : null }, queryParamsHandling: 'merge' })
      .then(() => document.getElementById('results')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }

  /** Clears search and filters but keeps the chosen sort order. */
  clearAll(): void {
    const sort = this.params().sort;
    this.router.navigate([], { relativeTo: this.route, queryParams: { sort: sort === 'newest' ? null : sort } });
  }
}
