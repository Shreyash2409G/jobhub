import { SalaryRangePipe } from './salary-range.pipe';
import { TimeAgoPipe } from './time-ago.pipe';

describe('SalaryRangePipe', () => {
  it('writes the range in LPA', () => {
    expect(new SalaryRangePipe().transform({ salaryMin: 6, salaryMax: 10 })).toBe('₹6–10 LPA');
  });
});

describe('TimeAgoPipe', () => {
  const daysAgo = (days: number) => new Date(Date.now() - days * 86_400_000).toISOString();
  const pipe = new TimeAgoPipe();

  it('says Today, then days, then weeks', () => {
    expect(pipe.transform(new Date().toISOString())).toBe('Today');
    expect(pipe.transform(daysAgo(1))).toBe('1 day ago');
    expect(pipe.transform(daysAgo(3))).toBe('3 days ago');
    expect(pipe.transform(daysAgo(21))).toBe('3 weeks ago');
  });
});
