import { computed, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { Observable, catchError, debounceTime, distinctUntilChanged, of, switchMap, tap } from 'rxjs';
import { ListQuery } from '../services/admin.service';
import { Paged } from '../models';

/**
 * State for a searchable, filterable, paged table. Call it inside a component (it needs an injection context).
 *   - typing in the search box waits 300 ms (debounce) before asking the API
 *   - switchMap drops an answer that arrives late if the person already typed something new
 *   - changing the search or the filter goes back to page 1
 */
export function createPagedList<T>(fetch: (query: ListQuery) => Observable<Paged<T>>, pageSize = 8, initialFilter = '') {
  const term = signal('');
  const filter = signal(initialFilter);
  const page = signal(1);
  const refresh = signal(0);
  const loading = signal(true);

  const debouncedTerm = toSignal(toObservable(term).pipe(debounceTime(300), distinctUntilChanged()), { initialValue: '' });
  const request = computed(() => ({ q: debouncedTerm(), filter: filter(), page: page(), limit: pageSize, refresh: refresh() }));

  const result = toSignal(
    toObservable(request).pipe(
      tap(() => loading.set(true)),
      switchMap((r) =>
        fetch({ q: r.q, filter: r.filter, page: r.page, limit: r.limit }).pipe(catchError(() => of<Paged<T>>({ items: [], total: 0 })))
      ),
      tap(() => loading.set(false))
    ),
    { initialValue: { items: [], total: 0 } as Paged<T> }
  );

  return {
    pageSize,
    term: term.asReadonly(),
    filter: filter.asReadonly(),
    page: page.asReadonly(),
    loading: loading.asReadonly(),
    items: computed(() => result().items),
    total: computed(() => result().total),
    setTerm: (value: string) => { term.set(value); page.set(1); },
    setFilter: (value: string) => { filter.set(value); page.set(1); },
    setPage: (value: number) => page.set(value),
    /** Fetch the current page again (after an action changed something). */
    reload: () => refresh.update((n) => n + 1),
  };
}
