import { describe, it, expect } from 'vitest';
import { monthLabels, bucketByMonth, bucketCumulativeByMonth } from './monthly';
import type { DetailedYearData } from './types';

function yearFixture(year: number, overrides: Partial<DetailedYearData> = {}): DetailedYearData {
  return {
    year,
    metrics: {} as any,
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

describe('monthLabels', () => {
  it('returns one label per month across the window, chronological', () => {
    const labels = monthLabels([yearFixture(2024), yearFixture(2025)]);
    expect(labels).toHaveLength(24);
    expect(labels[0]).toBe('2024-01');
    expect(labels[23]).toBe('2025-12');
  });
});

describe('bucketByMonth', () => {
  it('counts dated events per calendar month across the window', () => {
    const years = [
      yearFixture(2024, { commitDayDates: ['2024-01-05', '2024-01-20', '2024-03-01'] }),
      yearFixture(2025, { commitDayDates: ['2025-12-31'] }),
    ];
    const counts = bucketByMonth(years, (y) => y.commitDayDates);
    expect(counts).toHaveLength(24);
    expect(counts[0]).toBe(2); // 2024-01
    expect(counts[2]).toBe(1); // 2024-03
    expect(counts[23]).toBe(1); // 2025-12
    expect(counts[1]).toBe(0); // 2024-02
  });
});

describe('bucketCumulativeByMonth', () => {
  it('produces a running total across the window', () => {
    const years = [
      yearFixture(2024, { starEvents: [{ repo: 'a', starredAt: '2024-02-01' }] }),
      yearFixture(2025, { starEvents: [{ repo: 'b', starredAt: '2025-01-01' }] }),
    ];
    const cumulative = bucketCumulativeByMonth(years, (y) => y.starEvents.map((s) => s.starredAt));
    expect(cumulative[0]).toBe(0); // 2024-01
    expect(cumulative[1]).toBe(1); // 2024-02
    expect(cumulative[11]).toBe(1); // 2024-12
    expect(cumulative[12]).toBe(2); // 2025-01
    expect(cumulative[23]).toBe(2); // 2025-12
  });
});
