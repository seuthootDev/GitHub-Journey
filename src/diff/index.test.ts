import { describe, it, expect } from 'vitest';
import { buildYearContexts } from './index';
import type { YearlyMetrics } from '../types';

function metrics(overrides: Partial<YearlyMetrics>): YearlyMetrics {
  return {
    year: 2022,
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
    ...overrides,
  };
}

describe('buildYearContexts', () => {
  it('marks only the last year as current', () => {
    const ctxs = buildYearContexts([metrics({ year: 2022 }), metrics({ year: 2023 })]);
    expect(ctxs.map((c) => c.isCurrent)).toEqual([false, true]);
  });

  it('gives the first year a null baseline', () => {
    const ctxs = buildYearContexts([metrics({ year: 2022 })]);
    expect(ctxs[0].baseline).toBeNull();
  });

  it('computes the baseline as the average of all other years', () => {
    const ctxs = buildYearContexts([
      metrics({ year: 2022, reviews: 0 }),
      metrics({ year: 2023, reviews: 10 }),
      metrics({ year: 2024, reviews: 20 }),
    ]);
    // baseline for 2024 = average of 2022, 2023 reviews = (0 + 10) / 2 = 5
    expect(ctxs[2].baseline?.avgReviews).toBe(5);
  });

  it('tracks consecutive years with the same dominant language', () => {
    const ctxs = buildYearContexts([
      metrics({ year: 2022, languageBytes: { Python: 100 } }),
      metrics({ year: 2023, languageBytes: { Python: 100 } }),
      metrics({ year: 2024, languageBytes: { TypeScript: 100 } }),
    ]);
    expect(ctxs.map((c) => c.sameLanguageStreakYears)).toEqual([1, 2, 1]);
  });

  it('resets the language streak after a change and back again', () => {
    const ctxs = buildYearContexts([
      metrics({ year: 2022, languageBytes: { Python: 100 } }),
      metrics({ year: 2023, languageBytes: { Go: 100 } }),
      metrics({ year: 2024, languageBytes: { Go: 100 } }),
      metrics({ year: 2025, languageBytes: { Go: 100 } }),
    ]);
    expect(ctxs.map((c) => c.sameLanguageStreakYears)).toEqual([1, 1, 2, 3]);
  });

  it('computes avgLanguageBreadth from distinct language counts of other years', () => {
    const ctxs = buildYearContexts([
      metrics({ year: 2022, languageBytes: { Python: 1, Go: 1 } }), // breadth 2
      metrics({ year: 2023, languageBytes: { Python: 1, Go: 1, Rust: 1, TypeScript: 1 } }), // breadth 4
      metrics({ year: 2024, languageBytes: {} }),
    ]);
    expect(ctxs[2].baseline?.avgLanguageBreadth).toBe(3);
  });
});
