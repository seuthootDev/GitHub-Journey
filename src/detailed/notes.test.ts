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
    ownMergedCount: 0,
    externalMergedCount: 0,
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
      yearFixture(
        { ownPRs: 63, externalPRs: 37, commitDays: 130 },
        { externalMergedPRs: [{ repo: 'a', date: '2026-01-01' }], externalMergedCount: 1 }
      ),
      'Open Source Contributor'
    );
    expect(note.lines.join(' ')).toMatch(/pull request/i);
  });

  it('names distinct external repos when contributor year has merged PRs', () => {
    const note = buildYearNote(
      yearFixture(
        { externalPRs: 5, commitDays: 50 },
        {
          externalMergedPRs: [
            { repo: 'react', date: '2024-01-15' },
            { repo: 'next', date: '2024-03-20' },
          ],
          externalMergedCount: 2,
        }
      ),
      'Open Source Contributor'
    );
    expect(note.lines[0]).toMatch(/react/);
    expect(note.lines[0]).toMatch(/next/);
    expect(note.lines[0]).toMatch(/External PRs landed/);
  });

  it('names created repos when builder year has new repos', () => {
    const note = buildYearNote(
      yearFixture(
        { reposCreated: 2, commitDays: 80, longLivedRepoCount: 1, languageBytes: { TypeScript: 5000 } },
        {
          repos: [
            { name: 'my-cli', createdAt: '2024-01-10T00:00:00Z', pushedAt: '2024-12-31T00:00:00Z' },
            { name: 'my-lib', createdAt: '2024-05-15T00:00:00Z', pushedAt: '2024-12-31T00:00:00Z' },
          ],
        }
      ),
      'Builder'
    );
    expect(note.lines[0]).toMatch(/my-cli/);
    expect(note.lines[0]).toMatch(/my-lib/);
    expect(note.lines[0]).toMatch(/2 repos created/);
  });

  it('handles edge case: reposCreated > 0 but no matching repos in array', () => {
    const note = buildYearNote(
      yearFixture(
        { reposCreated: 1, commitDays: 30, longLivedRepoCount: 0 },
        { repos: [] } // Empty repos array despite reposCreated: 1
      ),
      'Builder'
    );
    // Should not crash, and should still have sensible output
    expect(note.lines[0]).toMatch(/1 repo created/);
    expect(note.lines[0]).not.toMatch(/undefined|null/);
  });
});
