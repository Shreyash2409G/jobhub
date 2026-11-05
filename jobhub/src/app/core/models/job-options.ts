import { ExperienceBand, JobType, SortOption, WorkMode } from './index';

/** Single source of truth for the filter facets (form, URL and service all use these). */
export const JOB_TYPES: JobType[] = ['Full Time', 'Part Time', 'Internship', 'Contract'];
export const EXPERIENCE_BANDS: ExperienceBand[] = ['Fresher', '1-3 years', '3-5 years', '5+ years'];
export const WORK_MODES: WorkMode[] = ['On-site', 'Hybrid', 'Remote'];

/** Salary bands in LPA: [from, to). */
export const SALARY_BANDS: Record<string, [number, number]> = {
  '0-3 LPA': [0, 3],
  '3-6 LPA': [3, 6],
  '6-10 LPA': [6, 10],
  '10+ LPA': [10, Infinity],
};
export const SALARY_OPTIONS = Object.keys(SALARY_BANDS);

export const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'newest', label: 'Newest' },
  { value: 'salary_asc', label: 'Salary: Low to High' },
  { value: 'salary_desc', label: 'Salary: High to Low' },
  { value: 'relevance', label: 'Relevance' },
];
