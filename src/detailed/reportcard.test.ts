import { describe, it, expect } from 'vitest';
import { buildReportCard } from './reportcard';
import type { DetailedYearData } from './types';

function yearFixture(year: number, metricsOverrides: any, eventOverrides: Partial<DetailedYearData> = {}): DetailedYearData {
  return {
    year,
    metrics: {
      year,
      languageBytes: {},
      newLanguageCount: 0,
      reposCreated: 0,
      reposActive: 0,
      longLivedRepoCount: 0,
      activeMonths: 0,
      commitDays: 0,
      longestStreakDays: 0,
      ownPRs: 0,
      externalPRs: 0,
      externalReposContributed: 0,
      reviews: 0,
      starsGained: 0,
      ...metricsOverrides,
    },
    repos: [],
    ownMergedPRs: [],
    externalMergedPRs: [],
    ownMergedCount: 0,
    externalMergedCount: 0,
    ownPROpenedEvents: [],
    externalPROpenedEvents: [],
    starEvents: [],
    reviewEvents: [],
    issueEvents: [],
    commitDayDates: [],
    firstContributionDay: null,
    ...eventOverrides,
  };
}

describe('buildReportCard', () => {
  it('marks the column maximum with a high, and does not mark ties', () => {
    const years = [
      yearFixture(2024, { commitDays: 10, longLivedRepoCount: 1 }),
      yearFixture(2025, { commitDays: 101, longLivedRepoCount: 2 }),
      yearFixture(2026, { commitDays: 130, longLivedRepoCount: 2 }),
    ];
    const { highs } = buildReportCard(years);
    expect(highs.has('2026:days')).toBe(true);
    expect(highs.has('2024:days')).toBe(false);
    expect(highs.has('2025:longLived')).toBe(true);
    expect(highs.has('2026:longLived')).toBe(true); // tie, both marked
  });

  it('never marks a column whose max is zero', () => {
    const years = [yearFixture(2024, { ownPRs: 0 }), yearFixture(2025, { ownPRs: 0 })];
    const { highs } = buildReportCard(years);
    expect(highs.has('2024:ownPRs')).toBe(false);
    expect(highs.has('2025:ownPRs')).toBe(false);
  });

  it('includes merged-PR totals and dominant language in each row', () => {
    const years = [
      yearFixture(
        2026,
        { ownPRs: 63, externalPRs: 37, languageBytes: { GDScript: 100 } },
        { ownMergedPRs: [{ repo: 'a', date: '2026-01-01' }], externalMergedPRs: [], ownMergedCount: 1, externalMergedCount: 0 }
      ),
    ];
    const { rows } = buildReportCard(years);
    expect(rows[0]).toMatchObject({ year: 2026, language: 'GDScript', ownMerged: 1, externalMerged: 0 });
  });

  it('uses ownMergedCount/externalMergedCount (search total_count), not the possibly-capped event array length', () => {
    const years = [
      yearFixture(
        2026,
        {},
        {
          // Only a 100-item sample of a much larger merged-PR history — the report card
          // column must reflect the real total, not this array's length.
          ownMergedPRs: Array.from({ length: 100 }, (_, i) => ({ repo: 'a', date: `2026-01-${(i % 28) + 1}` })),
          ownMergedCount: 150,
          externalMergedCount: 40,
        }
      ),
    ];
    const { rows } = buildReportCard(years);
    expect(rows[0].ownMerged).toBe(150);
    expect(rows[0].externalMerged).toBe(40);
  });
});
