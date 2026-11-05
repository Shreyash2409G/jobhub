import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'salaryRange' })
export class SalaryRangePipe implements PipeTransform {
  transform(job: { salaryMin: number; salaryMax: number }): string {
    return `₹${job.salaryMin}–${job.salaryMax} LPA`;
  }
}
