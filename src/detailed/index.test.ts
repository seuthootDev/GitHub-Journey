import { describe, it, expect } from 'vitest';
import { toDetailedYearData, windowTotals } from './index';
import type { RawYearData } from '../fetch/types';
import type { YearlyMetrics } from '../types';
import type { DetailedYearData } from './types';

function rawFixture(overrides: Partial<RawYearData> = {}): RawYearData {
  return {
    year: 2024,
    repos: [],
    activeRepoNames: [],
    contributionCalendar: {
      weeks: [
        {
          contributionDays: [
            { date: '2024-01-01', contributionCount: 0 },
            { date: '2024-03-05', contributionCount: 2 },
            { date: '2024-03-10', contributionCount: 1 },
          ],
        },
      ],
    },
    ownPRCount: 0,
    externalPRCount: 0,
    externalRepoCount: 0,
    reviewCount: 0,
    starsGainedThisYear: 0,
    ownMergedPRs: [],
    externalMergedPRs: [],
    ownMergedCount: 0,
    externalMergedCount: 0,
    ownPROpenedEvents: [],
    externalPROpenedEvents: [],
    starEvents: [],
    ...overrides,
  };
}

const metricsFixture: YearlyMetrics = {
  year: 2024,
  languageBytes: {},
  newLanguageCount: 0,
  reposCreated: 0,
  reposActive: 0,
  longLivedRepoCount: 0,
  activeMonths: 1,
  commitDays: 2,
  longestStreakDays: 1,
  ownPRs: 0,
  externalPRs: 0,
  externalReposContributed: 0,
  reviews: 0,
  starsGained: 0,
};

describe('toDetailedYearData', () => {
  it('finds the earliest date with a contribution as firstContributionDay', () => {
    const result = toDetailedYearData(rawFixture(), metricsFixture);
    expect(result.firstContributionDay).toBe('2024-03-05');
  });

  it('returns null for firstContributionDay when the whole year is empty', () => {
    const raw = rawFixture({
      contributionCalendar: { weeks: [{ contributionDays: [{ date: '2024-01-01', contributionCount: 0 }] }] },
    });
    const result = toDetailedYearData(raw, metricsFixture);
    expect(result.firstContributionDay).toBeNull();
  });

  it('passes through the raw event arrays and metrics unchanged', () => {
    const raw = rawFixture({
      ownMergedPRs: [{ repo: 'a/b', date: '2024-05-01' }],
    });
    const result = toDetailedYearData(raw, metricsFixture);
    expect(result.ownMergedPRs).toEqual([{ repo: 'a/b', date: '2024-05-01' }]);
    expect(result.metrics).toBe(metricsFixture);
  });

  it('passes through ownMergedCount/externalMergedCount straight from raw, even when they exceed the event array length', () => {
    const raw = rawFixture({
      ownMergedPRs: [{ repo: 'a/b', date: '2024-05-01' }],
      ownMergedCount: 150,
      externalMergedCount: 40,
    });
    const result = toDetailedYearData(raw, metricsFixture);
    expect(result.ownMergedCount).toBe(150);
    expect(result.externalMergedCount).toBe(40);
  });
});

function windowTotalsYearFixture(overrides: Partial<DetailedYearData> = {}): DetailedYearData {
  return {
    year: 2024,
    metrics: metricsFixture,
    repos: [],
    ownMergedPRs: [],
    externalMergedPRs: [],
    ownMergedCount: 0,
    externalMergedCount: 0,
    ownPROpenedEvents: [],
    externalPROpenedEvents: [],
    starEvents: [],
    commitDayDates: [],
    firstContributionDay: null,
    ...overrides,
  };
}

describe('windowTotals', () => {
  it('sums ownMerged/externalMerged from ownMergedCount/externalMergedCount, not event array length', () => {
    const years = [
      windowTotalsYearFixture({
        ownMergedPRs: Array.from({ length: 5 }, (_, i) => ({ repo: 'a', date: `2024-01-0${i + 1}` })),
        ownMergedCount: 150,
        externalMergedCount: 40,
      }),
    ];
    const totals = windowTotals(years);
    expect(totals.ownMerged).toBe(150);
    expect(totals.externalMerged).toBe(40);
  });
});
