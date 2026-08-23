import { describe, it, expect } from 'vitest';
import { buildYearNote } from './notes';
import type { DetailedYearData } from './types';

function yearFixture(overrides: Partial<DetailedYearData['metrics']> = {}, extra: Partial<DetailedYearData> = {}): DetailedYearData {
  return {
    year: 2024,
    metrics: {
      year: 2024,
      languageBytes: {},
      newLanguageCount: 0,
      reposCreated: 1,
      reposActive: 1,
      longLivedRepoCount: 0,
      activeMonths: 1,
      commitDays: 10,
      longestStreakDays: 4,
      ownPRs: 0,
      externalPRs: 0,
      externalReposContributed: 0,
      reviews: 0,
      starsGained: 0,
      ...overrides,
    },
    repos: [],
    ownMergedPRs: [],
    externalMergedPRs: [],
    ownPROpenedEvents: [],
    externalPROpenedEvents: [],
    starEvents: [],
    commitDayDates: [],
    firstContributionDay: null,
    ...extra,
  };
}

describe('buildYearNote', () => {
  it('frames a floor year as the start of the story, never a failure', () => {
    const note = buildYearNote(yearFixture(), 'Quiet Year');
    expect(note.heading).toBe('2024 Quiet Year');
    expect(note.lines.join(' ')).not.toMatch(/fail|nothing|F\b/i);
  });

  it('is a complete sentence using only repos/days for a 0-PR, 0-star year', () => {
    const note = buildYearNote(yearFixture(), 'Quiet Year');
    expect(note.lines.join(' ')).not.toMatch(/pull request|star/i);
  });

  it('mentions external PRs for a contributor year', () => {
    const note = buildYearNote(
      yearFixture({ ownPRs: 63, externalPRs: 37, commitDays: 130 }, { externalMergedPRs: [{ repo: 'a', date: '2026-01-01' }] }),
      'Open Source Contributor'
    );
    expect(note.lines.join(' ')).toMatch(/pull request/i);
  });
});
