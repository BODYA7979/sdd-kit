import { describe, expect, it } from 'vitest';
import type { JobFilters } from '@/types/api/jobs';
import { parseJobFilters, toQueryString } from './search-params';

describe('job search params', () => {
  it('parses filters from search params', () => {
    expect(
      parseJobFilters({
        q: ' laravel ',
        location: 'Berlin',
        remote: '1',
        employment_type: 'full_time',
        company: 'acme-robotics',
        page: '2',
        per_page: '10',
      }),
    ).toEqual({
      q: 'laravel',
      location: 'Berlin',
      remote: true,
      employment_type: 'full_time',
      company: 'acme-robotics',
      page: 2,
      per_page: 10,
    });
  });

  it('drops empty and unknown values', () => {
    expect(
      parseJobFilters({
        q: '',
        location: '   ',
        remote: 'maybe',
        employment_type: 'toString',
        company: 'Not A Slug!',
        page: '0',
        per_page: '500',
        sort: 'salary',
      }),
    ).toEqual({});

    expect(parseJobFilters({ q: ['react', 'vue'] })).toEqual({ q: 'react' });
  });

  it('round-trips through toQueryString', () => {
    const filters: JobFilters = {
      q: 'next.js & react',
      location: 'Amsterdam',
      remote: false,
      employment_type: 'contract',
      company: 'northwind-health',
      page: 3,
    };

    const query = toQueryString(filters);
    const parsed = parseJobFilters(Object.fromEntries(new URLSearchParams(query)));

    expect(parsed).toEqual(filters);
    expect(toQueryString({})).toBe('');
    expect(toQueryString({ page: 1 })).toBe('');
  });
});
