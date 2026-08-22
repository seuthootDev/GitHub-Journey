import { describe, it, expect } from 'vitest';
import { renderPinHeadline, renderGistBody } from './index';
import type { JourneyYear, YearlyMetrics } from '../types';

const sampleYears: JourneyYear[] = [
  { year: 2024, archetype: 'Explorer', reason: { kind: 'metric', icon: '🌱', text: '+3 langs' }, isCurrent: false, sameLanguageStreakYears: 1 },
  { year: 2025, archetype: 'Specialist', reason: { kind: 'language', emoji: '🐍', label: 'Python' }, isCurrent: false, sameLanguageStreakYears: 2 },
  {
    year: 2026,
    archetype: 'Open Source Contributor',
    reason: { kind: 'metric', icon: '🔀', text: '+7 ext PRs' },
    isCurrent: true,
    sameLanguageStreakYears: 1,
  },
];

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

const sampleMetrics: YearlyMetrics[] = [
  metrics({ year: 2024, languageBytes: { Java: 1, Python: 1, Go: 1 }, reposActive: 2, commitDays: 40, longestStreakDays: 9 }),
  metrics({ year: 2025, languageBytes: { Python: 900, Go: 100 }, reposActive: 3, commitDays: 180, longestStreakDays: 30, ownPRs: 5 }),
  metrics({ year: 2026, languageBytes: { TypeScript: 600 }, reposActive: 5, longLivedRepoCount: 5, commitDays: 170, externalPRs: 7 }),
];

describe('renderPinHeadline', () => {
  it('renders one line per year plus a summary line', () => {
    const lines = renderPinHeadline(sampleYears).split('\n');
    expect(lines).toHaveLength(4);
  });

  it('marks only the current year with the ● marker', () => {
    const lines = renderPinHeadline(sampleYears).split('\n');
    expect(lines[2]).toContain('●');
    expect(lines[0]).not.toContain('●');
    expect(lines[1]).not.toContain('●');
    expect(lines[3]).not.toContain('●');
  });

  it('renders the exact expected text', () => {
    expect(renderPinHeadline(sampleYears)).toBe(
      [
        '2024 Explorer · 🌱 +3 langs',
        '2025 Specialist · 🐍 Python',
        '2026 ● Open Source Contributor · 🔀 +7 ext PRs',
        'Broke out this year as Open Source Contributor',
      ].join('\n')
    );
  });
});

describe('renderGistBody', () => {
  it('includes the pin headline verbatim at the top', () => {
    const body = renderGistBody('seuthootDev', 'Jung Seunghoon', sampleYears, sampleMetrics);
    expect(body).toContain(renderPinHeadline(sampleYears));
  });

  it('includes the username', () => {
    const body = renderGistBody('seuthootDev', 'Jung Seunghoon', sampleYears, sampleMetrics);
    expect(body).toContain('seuthootDev');
  });

  it('reuses the pin summary as the closing synthesis line', () => {
    const body = renderGistBody('seuthootDev', 'Jung Seunghoon', sampleYears, sampleMetrics);
    expect(body).toContain('Broke out this year as Open Source Contributor');
  });

  it('includes a per-year breakdown table with languages, repos, commit consistency, and PR/review/star data', () => {
    const body = renderGistBody('seuthootDev', 'Jung Seunghoon', sampleYears, sampleMetrics);
    expect(body).toMatch(/2025.*Python.*3.*180.*30.*5/s);
    expect(body).toMatch(/2026.*7/s);
  });
});
