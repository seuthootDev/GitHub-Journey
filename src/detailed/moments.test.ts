import { describe, it, expect } from 'vitest';
import { selectHero, selectMoreMoments } from './moments';
import type { DetailedYearData } from './types';

function yearFixture(year: number, overrides: Partial<DetailedYearData> = {}): DetailedYearData {
  return {
    year,
    metrics: {} as any,
    repos: [],
    ownMergedPRs: [],
    externalMergedPRs: [],
    ownPROpenedEvents: [],
    externalPROpenedEvents: [],
    starEvents: [],
    commitDayDates: [],
    firstContributionDay: null,
    ...overrides,
  };
}

describe('selectHero', () => {
  it('picks the oldest repo by createdAt as the hero, across all years', () => {
    const years = [
      yearFixture(2024, {
        repos: [{ name: 'seuthootDev', createdAt: '2024-09-01T00:00:00Z', pushedAt: '2024-09-01T00:00:00Z' }],
      }),
      yearFixture(2025, {
        repos: [{ name: 'later-repo', createdAt: '2025-01-01T00:00:00Z', pushedAt: '2025-01-01T00:00:00Z' }],
      }),
    ];
    expect(selectHero(years)).toEqual({ date: '2024-09-01', name: 'seuthootDev' });
  });

  it('returns null when there are no repos', () => {
    expect(selectHero([yearFixture(2024)])).toBeNull();
  });
});

describe('selectMoreMoments', () => {
  const hero = { date: '2024-09-01', name: 'seuthootDev' };

  it('walks tier 1 first: first ext-merged PR, first star, first own-merged PR', () => {
    const years = [
      yearFixture(2025, {
        ownMergedPRs: [{ repo: 'a/hanghae99-backend-week1', date: '2025-07-03T00:00:00Z' }],
      }),
      yearFixture(2026, {
        externalMergedPRs: [{ repo: 'b/Distributed_MES', date: '2026-01-10T00:00:00Z' }],
        starEvents: [{ repo: 'qml-vtk-python-pyside6', starredAt: '2026-02-27T00:00:00Z' }],
      }),
    ];
    const moments = selectMoreMoments(years, hero);
    expect(moments).toEqual([
      { date: '2026-01-10', name: 'b/Distributed_MES', why: 'first external PR, merged' },
      { date: '2026-02-27', name: 'qml-vtk-python-pyside6', why: 'first star' },
      { date: '2025-07-03', name: 'a/hanghae99-backend-week1', why: 'first own PR merged' },
    ]);
  });

  it('caps at 4 and never includes the hero repo/date', () => {
    const years = [
      yearFixture(2026, {
        externalMergedPRs: [
          { repo: 'x/one', date: '2026-01-01T00:00:00Z' },
        ],
        starEvents: [
          { repo: 'x/two', starredAt: '2026-01-02T00:00:00Z' },
          { repo: 'x/three', starredAt: '2026-01-03T00:00:00Z' },
        ],
        ownMergedPRs: [{ repo: 'x/four', date: '2026-01-04T00:00:00Z' }],
      }),
    ];
    const moments = selectMoreMoments(years, hero);
    expect(moments.length).toBeLessThanOrEqual(4);
    expect(moments.some((m) => m.name === hero.name)).toBe(false);
  });

  it('falls back to tier 2 (first contribution day) for a quiet, PR-less account', () => {
    const years = [yearFixture(2024, { firstContributionDay: '2024-03-05' })];
    const moments = selectMoreMoments(years, hero);
    expect(moments).toEqual([{ date: '2024-03-05', name: '2024-03-05', why: 'first contribution day' }]);
  });

  it('returns an empty list, not an error, when there is nothing beyond the hero', () => {
    const moments = selectMoreMoments([yearFixture(2024)], hero);
    expect(moments).toEqual([]);
  });
});
