import { convertToParamMap } from '@angular/router';
import { formToQuery, paramsToFormValue, parseQuery } from './job-filter.config';

describe('job search URL helpers', () => {
  it('keeps valid values and ignores unknown ones', () => {
    const query = parseQuery(
      convertToParamMap({ keyword: ' angular ', jobType: ['Full Time', 'Hacker'], sort: 'nonsense', page: '0', salary: '10+ LPA' })
    );
    expect(query.keyword).toBe('angular');
    expect(query.jobType).toEqual(['Full Time']);
    expect(query.salary).toEqual(['10+ LPA']);
    expect(query.sort).toBe('newest');
    expect(query.page).toBe(1);
  });

  it('turns the form back into a clean query string', () => {
    const parsed = parseQuery(convertToParamMap({ location: 'Pune', workMode: ['Remote', 'Hybrid'], sort: 'salary_desc' }));
    const query = formToQuery(paramsToFormValue(parsed));
    expect(query['location']).toBe('Pune');
    expect(query['workMode']).toEqual(['Hybrid', 'Remote']);
    expect(query['sort']).toBe('salary_desc');
    expect(query['jobType']).toBeNull(); // nothing selected: left out of the URL
    expect(query['keyword']).toBeNull();
  });
});
