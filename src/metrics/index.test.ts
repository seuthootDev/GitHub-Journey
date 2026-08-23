import { describe, it, expect } from 'vitest';
import { toYearlyMetrics } from './index';
import type { RawYearData } from '../fetch/types';

function raw(overrides: Partial<RawYearData>): RawYearData {
  return {
    year: 2024,
    repos: [],
    activeRepoNames: [],
    contributionCalendar: { weeks: [] },
    ownPRCount: 0,
    externalPRCount: 0,
    externalRepoCount: 0,
    reviewCount: 0,
    starsGainedThisYear: 0,
    ownMergedPRs: [],
    externalMergedPRs: [],
    ownPROpenedEvents: [],
    externalPROpenedEvents: [],
    starEvents: [],
    ...overrides,
  };
}

describe('toYearlyMetrics', () => {
  it('sums language bytes across repos with commit activity in the target year', () => {
    const data = raw({
      repos: [
        { name: 'a', createdAt: '2020-01-01T00:00:00Z', pushedAt: '2024-06-01T00:00:00Z', languages: { Python: 100 } },
        { name: 'b', createdAt: '2020-01-01T00:00:00Z', pushedAt: '2024-07-01T00:00:00Z', languages: { Python: 50, Go: 20 } },
        { name: 'c', createdAt: '2020-01-01T00:00:00Z', pushedAt: '2023-01-01T00:00:00Z', languages: { Rust: 999 } },
      ],
      activeRepoNames: ['a', 'b'],
    });
    const result = toYearlyMetrics(data, new Set());
    expect(result.languageBytes).toEqual({ Python: 150, Go: 20 });
  });

  it('counts new languages not seen in prior years', () => {
    const data = raw({
      repos: [{ name: 'a', createdAt: '2024-01-01T00:00:00Z', pushedAt: '2024-01-01T00:00:00Z', languages: { Python: 1, Go: 1 } }],
      activeRepoNames: ['a'],
    });
    const result = toYearlyMetrics(data, new Set(['Python']));
    expect(result.newLanguageCount).toBe(1);
  });

  it('counts repos created in the target year', () => {
    const data = raw({
      repos: [
        { name: 'a', createdAt: '2024-03-01T00:00:00Z', pushedAt: '2024-03-01T00:00:00Z', languages: {} },
        { name: 'b', createdAt: '2023-03-01T00:00:00Z', pushedAt: '2024-03-01T00:00:00Z', languages: {} },
      ],
    });
    expect(toYearlyMetrics(data, new Set()).reposCreated).toBe(1);
  });

  it('counts repos active (with commit activity) in the target year', () => {
    const data = raw({
      repos: [
        { name: 'a', createdAt: '2020-01-01T00:00:00Z', pushedAt: '2024-03-01T00:00:00Z', languages: {} },
        { name: 'b', createdAt: '2020-01-01T00:00:00Z', pushedAt: '2023-03-01T00:00:00Z', languages: {} },
      ],
      activeRepoNames: ['a'],
    });
    expect(toYearlyMetrics(data, new Set()).reposActive).toBe(1);
  });

  it('counts long-lived repos as active repos at least a year old', () => {
    const data = raw({
      repos: [
        { name: 'a', createdAt: '2023-01-01T00:00:00Z', pushedAt: '2024-06-01T00:00:00Z', languages: {} }, // ~17mo old
        { name: 'b', createdAt: '2024-05-01T00:00:00Z', pushedAt: '2024-06-01T00:00:00Z', languages: {} }, // ~1mo old
      ],
      activeRepoNames: ['a', 'b'],
    });
    expect(toYearlyMetrics(data, new Set()).longLivedRepoCount).toBe(1);
  });

  it('counts commit days and active months within the target year only', () => {
    const data = raw({
      contributionCalendar: {
        weeks: [
          {
            contributionDays: [
              { date: '2024-01-05', contributionCount: 2 },
              { date: '2024-01-06', contributionCount: 0 },
              { date: '2024-02-01', contributionCount: 1 },
              { date: '2023-12-31', contributionCount: 5 },
            ],
          },
        ],
      },
    });
    const result = toYearlyMetrics(data, new Set());
    expect(result.commitDays).toBe(2);
    expect(result.activeMonths).toBe(2);
  });

  it('computes the longest consecutive-day streak within the target year', () => {
    const data = raw({
      contributionCalendar: {
        weeks: [
          {
            contributionDays: [
              { date: '2024-01-01', contributionCount: 1 },
              { date: '2024-01-02', contributionCount: 1 },
              { date: '2024-01-03', contributionCount: 0 },
              { date: '2024-01-04', contributionCount: 1 },
              { date: '2024-01-05', contributionCount: 1 },
              { date: '2024-01-06', contributionCount: 1 },
            ],
          },
        ],
      },
    });
    expect(toYearlyMetrics(data, new Set()).longestStreakDays).toBe(3);
  });

  it('passes PR, review, and star fields through unchanged', () => {
    const data = raw({ ownPRCount: 4, externalPRCount: 7, externalRepoCount: 3, reviewCount: 12, starsGainedThisYear: 58 });
    const result = toYearlyMetrics(data, new Set());
    expect(result.ownPRs).toBe(4);
    expect(result.externalPRs).toBe(7);
    expect(result.externalReposContributed).toBe(3);
    expect(result.reviews).toBe(12);
    expect(result.starsGained).toBe(58);
  });
});
