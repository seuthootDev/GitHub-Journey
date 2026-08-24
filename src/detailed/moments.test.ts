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
    ownMergedCount: 0,
    externalMergedCount: 0,
    ownPROpenedEvents: [],
    externalPROpenedEvents: [],
    starEvents: [],
    reviewEvents: [],
    issueEvents: [],
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

  it('never includes the hero repo/date, and stays within a small fixture\'s real candidate count', () => {
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

  it('caps at 8 (the full tier1+tier2 candidate pool), not 4', () => {
    const years = [
      yearFixture(2026, {
        externalMergedPRs: [{ repo: 'x/ext-merged', date: '2026-01-01T00:00:00Z' }],
        starEvents: [
          { repo: 'x/first-star', starredAt: '2026-01-02T00:00:00Z' },
          { repo: 'x/later-star', starredAt: '2026-01-05T00:00:00Z' },
        ],
        ownMergedPRs: [
          { repo: 'x/own-merged', date: '2026-02-01T00:00:00Z' },
          { repo: 'x/peak-merge', date: '2026-03-01T00:00:00Z' },
          { repo: 'x/peak-merge', date: '2026-03-05T00:00:00Z' },
        ],
        firstContributionDay: '2020-01-01',
        repos: [{ name: 'x/long-lived', createdAt: '2024-06-01T00:00:00Z', pushedAt: '2026-06-01T00:00:00Z' }],
        commitDayDates: ['2026-04-01', '2026-04-02'],
      }),
    ];
    const moments = selectMoreMoments(years, hero);
    expect(moments.length).toBe(8);
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

describe('selectMoreMoments tier 1 candidate 4 (peak merge month)', () => {
  const hero = { date: '2024-09-01', name: 'seuthootDev' };

  it('fires and picks the dominant repo in the peak merge month, from own+ext merged events across multiple months and repos', () => {
    const years = [
      yearFixture(2026, {
        externalMergedPRs: [{ repo: 'b/single-ext', date: '2026-01-01T00:00:00Z' }],
        ownMergedPRs: [
          { repo: 'a/first', date: '2026-01-05T00:00:00Z' },
          { repo: 'c/dominant', date: '2026-03-02T00:00:00Z' },
          { repo: 'c/dominant', date: '2026-03-10T00:00:00Z' },
          { repo: 'd/other', date: '2026-03-15T00:00:00Z' },
        ],
      }),
    ];
    const moments = selectMoreMoments(years, hero);
    expect(moments).toEqual([
      { date: '2026-01-01', name: 'b/single-ext', why: 'first external PR, merged' },
      { date: '2026-01-05', name: 'a/first', why: 'first own PR merged' },
      { date: '2026-03-02', name: 'c/dominant', why: 'peak merge month (3 merged)' },
    ]);
  });
});

describe('selectMoreMoments 7-day proximity to hero', () => {
  const hero = { date: '2024-09-01', name: 'seuthootDev' };

  it('skips a first contribution day within 7 days of the hero date', () => {
    const years = [yearFixture(2024, { firstContributionDay: '2024-09-05' })];
    const moments = selectMoreMoments(years, hero);
    expect(moments).toEqual([]);
  });

  it('keeps a first contribution day 8+ days from the hero date', () => {
    const years = [yearFixture(2024, { firstContributionDay: '2024-09-10' })];
    const moments = selectMoreMoments(years, hero);
    expect(moments).toEqual([{ date: '2024-09-10', name: '2024-09-10', why: 'first contribution day' }]);
  });
});

describe('selectMoreMoments tier 2: longest-lived repo', () => {
  const hero = { date: '2024-09-01', name: 'seuthootDev' };

  it('fires when a repo has been alive >= 365 days and was pushed within the window years', () => {
    const years = [
      yearFixture(2024),
      yearFixture(2025, {
        repos: [{ name: 'long-lived-repo', createdAt: '2023-01-01T00:00:00Z', pushedAt: '2025-06-01T00:00:00Z' }],
      }),
    ];
    const moments = selectMoreMoments(years, hero);
    expect(moments).toHaveLength(1);
    expect(moments[0].date).toBe('2025-06-01');
    expect(moments[0].name).toBe('long-lived-repo');
    expect(moments[0].why).toMatch(/^longest-lived repo \(\d+ months\)$/);
  });
});

describe('selectMoreMoments tier 2: peak commit-days month', () => {
  const hero = { date: '2024-09-01', name: 'seuthootDev' };

  it('fires and picks the month with the most commit days', () => {
    const years = [
      yearFixture(2025, { commitDayDates: ['2025-03-01', '2025-03-05', '2025-03-10'] }),
      yearFixture(2026, { commitDayDates: ['2026-01-01', '2026-01-02'] }),
    ];
    const moments = selectMoreMoments(years, hero);
    expect(moments).toEqual([{ date: '2025-03-01', name: '2025-03', why: 'busiest month (3 commit days)' }]);
  });
});

describe('selectMoreMoments later star cluster (count-aware why)', () => {
  const hero = { date: '2024-09-01', name: 'seuthootDev' };

  it('says "more stars land" (unchanged) when the later-star repo has exactly 1 star', () => {
    const years = [
      yearFixture(2026, {
        starEvents: [
          { repo: 'x/first', starredAt: '2026-01-01T00:00:00Z' },
          { repo: 'x/second', starredAt: '2026-01-02T00:00:00Z' },
        ],
      }),
    ];
    const moments = selectMoreMoments(years, hero);
    const laterStarMoment = moments.find((m) => m.name === 'x/second');
    expect(laterStarMoment?.why).toBe('more stars land');
  });

  it('says "N more stars land" when the later-star repo has more than 1 star', () => {
    const years = [
      yearFixture(2026, {
        starEvents: [
          { repo: 'x/first', starredAt: '2026-01-01T00:00:00Z' },
          { repo: 'x/second', starredAt: '2026-01-02T00:00:00Z' },
          { repo: 'x/second', starredAt: '2026-01-03T00:00:00Z' },
        ],
      }),
    ];
    const moments = selectMoreMoments(years, hero);
    const laterStarMoment = moments.find((m) => m.name === 'x/second');
    expect(laterStarMoment?.why).toBe('2 more stars land');
  });
});

describe('selectMoreMoments peak-merge-month date/repo pairing (bug 1 regression)', () => {
  const hero = { date: '2024-09-01', name: 'seuthootDev' };

  it('pairs the dominant repo with one of ITS OWN event dates, not the first event in array order within the peak month', () => {
    const years = [
      yearFixture(2026, {
        ownMergedPRs: [
          { repo: 'other/repo', date: '2026-03-01T00:00:00Z' },
          { repo: 'dominant/repo', date: '2026-03-05T00:00:00Z' },
          { repo: 'dominant/repo', date: '2026-03-12T00:00:00Z' },
        ],
      }),
    ];
    const moments = selectMoreMoments(years, hero);
    const peakMonthMoment = moments.find((m) => m.why.startsWith('peak merge month'));
    expect(peakMonthMoment).toEqual({
      date: '2026-03-05',
      name: 'dominant/repo',
      why: 'peak merge month (3 merged)',
    });
  });
});

describe('selectMoreMoments hero resurfacing (bug 2 regression)', () => {
  it('excludes any candidate whose name matches the hero, even under a different date', () => {
    const hero = { date: '2024-09-01', name: 'seuthootDev' };
    const years = [
      yearFixture(2024, {
        repos: [{ name: 'seuthootDev', createdAt: '2024-09-01T00:00:00Z', pushedAt: '2026-06-01T00:00:00Z' }],
      }),
      yearFixture(2025),
      yearFixture(2026),
    ];
    const moments = selectMoreMoments(years, hero);
    expect(moments.some((m) => m.name === hero.name)).toBe(false);
    expect(moments).toEqual([]);
  });
});
