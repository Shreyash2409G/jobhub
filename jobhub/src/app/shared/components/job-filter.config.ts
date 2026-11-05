import { FormControl, FormGroup } from '@angular/forms';
import { ParamMap } from '@angular/router';
import { ExperienceBand, JobSearchParams, JobType, SortOption, WorkMode } from '../../core/models';
import { EXPERIENCE_BANDS, JOB_TYPES, SALARY_OPTIONS, SORT_OPTIONS, WORK_MODES } from '../../core/models/job-options';

/** A group of checkboxes: { 'Full Time': true, 'Part Time': false, ... } */
type Facet = FormGroup<Record<string, FormControl<boolean>>>;

export type JobFilterForm = FormGroup<{
  keyword: FormControl<string>;
  location: FormControl<string>;
  category: FormControl<string>;
  sort: FormControl<SortOption>;
  jobType: Facet;
  experience: Facet;
  salary: Facet;
  workMode: Facet;
}>;
export type JobFilterValue = ReturnType<JobFilterForm['getRawValue']>;

/** What the URL query string parses into (arrays are never undefined). */
export interface ParsedQuery extends JobSearchParams {
  jobType: JobType[];
  experience: ExperienceBand[];
  salary: string[];
  workMode: WorkMode[];
  sort: SortOption;
  page: number;
}

const text = (value = '') => new FormControl(value, { nonNullable: true });
const facet = (options: readonly string[]): Facet =>
  new FormGroup(Object.fromEntries(options.map((o) => [o, new FormControl(false, { nonNullable: true })])));

export function createJobFilterForm(): JobFilterForm {
  return new FormGroup({
    keyword: text(),
    location: text(),
    category: text(),
    sort: new FormControl<SortOption>('newest', { nonNullable: true }),
    jobType: facet(JOB_TYPES),
    experience: facet(EXPERIENCE_BANDS),
    salary: facet(SALARY_OPTIONS),
    workMode: facet(WORK_MODES),
  });
}

const toRecord = (options: readonly string[], selected: readonly string[] = []) =>
  Object.fromEntries(options.map((o) => [o, selected.includes(o)]));
const selectedKeys = (group: Record<string, boolean>) => Object.keys(group).filter((k) => group[k]);

/** URL -> parsed, validated search params */
export function parseQuery(map: ParamMap): ParsedQuery {
  const pick = <T extends string>(key: string, allowed: readonly T[]): T[] =>
    map.getAll(key).filter((v): v is T => (allowed as readonly string[]).includes(v));
  const sort = map.get('sort') as SortOption;
  const category = Number(map.get('category'));
  const page = Number(map.get('page'));
  return {
    keyword: map.get('keyword')?.trim() || undefined,
    location: map.get('location') || undefined,
    category: category > 0 ? category : undefined,
    jobType: pick('jobType', JOB_TYPES),
    experience: pick('experience', EXPERIENCE_BANDS),
    salary: pick('salary', SALARY_OPTIONS),
    workMode: pick('workMode', WORK_MODES),
    sort: SORT_OPTIONS.some((o) => o.value === sort) ? sort : 'newest',
    page: Number.isInteger(page) && page > 0 ? page : 1,
  };
}

/** Parsed params -> values for form.patchValue() */
export function paramsToFormValue(p: Partial<ParsedQuery>): JobFilterValue {
  return {
    keyword: p.keyword ?? '',
    location: p.location ?? '',
    category: p.category ? String(p.category) : '',
    sort: p.sort ?? 'newest',
    jobType: toRecord(JOB_TYPES, p.jobType),
    experience: toRecord(EXPERIENCE_BANDS, p.experience),
    salary: toRecord(SALARY_OPTIONS, p.salary),
    workMode: toRecord(WORK_MODES, p.workMode),
  };
}

/** Form value -> query params (empty values become null so the URL stays clean). */
export function formToQuery(v: JobFilterValue): Record<string, string | string[] | null> {
  const list = (group: Record<string, boolean>) => {
    const keys = selectedKeys(group);
    return keys.length ? keys : null;
  };
  return {
    keyword: v.keyword.trim() || null,
    location: v.location || null,
    category: v.category || null,
    sort: v.sort === 'newest' ? null : v.sort,
    jobType: list(v.jobType),
    experience: list(v.experience),
    salary: list(v.salary),
    workMode: list(v.workMode),
  };
}
