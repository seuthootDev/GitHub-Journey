import { describe, it, expect } from 'vitest';
import { evaluateYear } from './index';
import type { YearContext, YearlyBaseline } from '../diff';
import type { YearlyMetrics } from '../types';

function metrics(overrides: Partial<YearlyMetrics>): YearlyMetrics {
  return {
    year: 2024,
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

function baseline(overrides: Partial<YearlyBaseline>): YearlyBaseline {
  return {
    avgReviews: 0,
    avgExternalPRs: 0,
    avgStarsGained: 0,
    avgReposCreated: 0,
    avgReposActive: 0,
    avgCommitDays: 0,
    avgLanguageBreadth: 0,
    ...overrides,
  };
}

function ctx(overrides: Partial<YearContext>): YearContext {
  return {
    metrics: metrics({}),
    baseline: null,
    sameLanguageStreakYears: 1,
    isCurrent: false,
    ...overrides,
  };
}

describe('evaluateYear', () => {
  it('picks Quiet Year when every axis is far below baseline', () => {
    const result = evaluateYear(
      ctx({
        metrics: metrics({ commitDays: 2, reposCreated: 0, ownPRs: 0, externalPRs: 0, reviews: 0 }),
        baseline: baseline({ avgCommitDays: 50, avgReposCreated: 5, avgReposActive: 5 }),
      })
    );
    expect(result.archetype).toBe('Quiet Year');
    expect(result.reason).toEqual({ kind: 'metric', icon: '💤', text: 'low activity' });
  });

  it('picks Rising Star when stars gained sharply exceed baseline', () => {
    const result = evaluateYear(
      ctx({
        metrics: metrics({ starsGained: 60, commitDays: 100 }),
        baseline: baseline({ avgStarsGained: 5, avgCommitDays: 100 }),
      })
    );
    expect(result.archetype).toBe('Rising Star');
    expect(result.reason).toEqual({ kind: 'metric', icon: '⭐', text: '+60 stars' });
  });

  it('picks Collaborator when reviews+externalPRs sharply exceed baseline', () => {
    const result = evaluateYear(
      ctx({
        metrics: metrics({ reviews: 20, externalPRs: 3, commitDays: 100 }),
        baseline: baseline({ avgReviews: 2, avgExternalPRs: 1, avgCommitDays: 100 }),
      })
    );
    expect(result.archetype).toBe('Collaborator');
    expect(result.reason).toEqual({ kind: 'metric', icon: '👀', text: '+20 reviews' });
  });

  it('picks Open Source Contributor for high external PR/repo activity without collaborator-level reviews', () => {
    const result = evaluateYear(
      ctx({
        metrics: metrics({ externalPRs: 7, externalReposContributed: 3, reviews: 0, commitDays: 100 }),
        baseline: baseline({ avgReviews: 0, avgExternalPRs: 0, avgCommitDays: 100 }),
      })
    );
    expect(result.archetype).toBe('Open Source Contributor');
    expect(result.reason).toEqual({ kind: 'metric', icon: '🔀', text: '+7 ext PRs' });
  });

  it('picks Builder for many active, long-lived owned repos', () => {
    const result = evaluateYear(
      ctx({ metrics: metrics({ reposActive: 4, longLivedRepoCount: 3, commitDays: 100 }) })
    );
    expect(result.archetype).toBe('Builder');
    expect(result.reason).toEqual({ kind: 'metric', icon: '📦', text: '3 long-lived' });
  });

  it('picks Creator for a spike in new repo creation', () => {
    const result = evaluateYear(ctx({ metrics: metrics({ reposCreated: 5, commitDays: 100 }) }));
    expect(result.archetype).toBe('Creator');
    expect(result.reason).toEqual({ kind: 'metric', icon: '🛠️', text: '+5 repos' });
  });

  it('picks Explorer for a spike in new languages with wide breadth', () => {
    const result = evaluateYear(
      ctx({
        metrics: metrics({
          newLanguageCount: 3,
          languageBytes: { Python: 1, Go: 1, Rust: 1, TypeScript: 1 },
          commitDays: 100,
        }),
      })
    );
    expect(result.archetype).toBe('Explorer');
    expect(result.reason).toEqual({ kind: 'metric', icon: '🌱', text: '+3 langs' });
  });

  it('picks Polyglot for sustained wide breadth across years without a fresh spike', () => {
    const result = evaluateYear(
      ctx({
        metrics: metrics({
          newLanguageCount: 0,
          languageBytes: { Python: 1, Go: 1, Rust: 1, TypeScript: 1 },
          commitDays: 100,
        }),
        baseline: baseline({ avgLanguageBreadth: 4, avgCommitDays: 100 }),
      })
    );
    expect(result.archetype).toBe('Polyglot');
    expect(result.reason).toEqual({ kind: 'metric', icon: '🌐', text: '4 langs active' });
  });

  it('picks Specialist for a sustained, narrow, deep single language', () => {
    const result = evaluateYear(
      ctx({
        metrics: metrics({ languageBytes: { Python: 900, Go: 100 }, commitDays: 100 }),
        sameLanguageStreakYears: 2,
      })
    );
    expect(result.archetype).toBe('Specialist');
    expect(result.reason).toEqual({ kind: 'language', emoji: '🐍', label: 'Python' });
  });

  it('falls back to Consistent when nothing else fires', () => {
    const result = evaluateYear(ctx({ metrics: metrics({ commitDays: 40, longestStreakDays: 12 }) }));
    expect(result.archetype).toBe('Consistent');
    expect(result.reason).toEqual({ kind: 'metric', icon: '🔥', text: '12d streak' });
  });

  it('never returns a year with no archetype at all', () => {
    const result = evaluateYear(ctx({ metrics: metrics({}) }));
    expect(result.archetype).toBeTruthy();
  });

  it('respects precedence: Collaborator beats Open Source Contributor when both match', () => {
    const result = evaluateYear(
      ctx({
        metrics: metrics({ reviews: 20, externalPRs: 10, externalReposContributed: 3, commitDays: 100 }),
        baseline: baseline({ avgReviews: 2, avgExternalPRs: 1, avgCommitDays: 100 }),
      })
    );
    expect(result.archetype).toBe('Collaborator');
  });

  it('carries isCurrent through from the YearContext', () => {
    const result = evaluateYear(ctx({ metrics: metrics({ commitDays: 40 }), isCurrent: true }));
    expect(result.isCurrent).toBe(true);
  });

  it('carries sameLanguageStreakYears through from the YearContext', () => {
    const result = evaluateYear(ctx({ metrics: metrics({ commitDays: 40 }), sameLanguageStreakYears: 3 }));
    expect(result.sameLanguageStreakYears).toBe(3);
  });

  it('carries the year through from the metrics', () => {
    const result = evaluateYear(ctx({ metrics: metrics({ year: 2019, commitDays: 40 }) }));
    expect(result.year).toBe(2019);
  });
});
