import { describe, it, expect } from 'vitest';
import { renderPinHeadline, renderGistBody } from './index';
import type { JourneyYear, YearlyMetrics } from '../types';

const sampleYears: JourneyYear[] = [
  { year: 2022, archetype: 'Explorer', reason: { kind: 'metric', icon: '🌱', text: '+3 langs' }, isCurrent: false },
  { year: 2023, archetype: 'Specialist', reason: { kind: 'language', emoji: '🐍', label: 'Python' }, isCurrent: false },
  { year: 2024, archetype: 'Rising Star', reason: { kind: 'metric', icon: '⭐', text: '+58 stars' }, isCurrent: false },
  {
    year: 2025,
    archetype: 'Open Source Contributor',
    reason: { kind: 'metric', icon: '🔀', text: '+7 ext PRs' },
    isCurrent: false,
  },
  { year: 2026, archetype: 'Builder', reason: { kind: 'metric', icon: '📦', text: '5 long-lived' }, isCurrent: true },
];

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

const sampleMetrics: YearlyMetrics[] = [
  metrics({ year: 2022, languageBytes: { Java: 1, Python: 1, Go: 1 }, reposActive: 2, commitDays: 40, longestStreakDays: 9 }),
  metrics({ year: 2023, languageBytes: { Python: 900, Go: 100 }, reposActive: 3, commitDays: 180, longestStreakDays: 30, ownPRs: 5 }),
  metrics({ year: 2024, languageBytes: { Python: 500 }, reposActive: 3, commitDays: 150, starsGained: 58 }),
  metrics({ year: 2025, languageBytes: { Python: 400, TypeScript: 100 }, reposActive: 4, commitDays: 160, externalPRs: 7, reviews: 2 }),
  metrics({ year: 2026, languageBytes: { TypeScript: 600 }, reposActive: 5, longLivedRepoCount: 5, commitDays: 170 }),
];

describe('renderPinHeadline', () => {
  it('renders exactly one line per year', () => {
    const lines = renderPinHeadline(sampleYears).split('\n');
    expect(lines).toHaveLength(5);
  });

  it('marks only the current year with the ● marker', () => {
    const lines = renderPinHeadline(sampleYears).split('\n');
    expect(lines[4]).toContain('●');
    for (const line of lines.slice(0, 4)) {
      expect(line).not.toContain('●');
    }
  });

  it('renders the exact expected text', () => {
    expect(renderPinHeadline(sampleYears)).toBe(
      [
        '2022 Explorer · 🌱 +3 langs',
        '2023 Specialist · 🐍 Python',
        '2024 Rising Star · ⭐ +58 stars',
        '2025 Open Source Contributor · 🔀 +7 ext PRs',
        '2026 ● Builder · 📦 5 long-lived',
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

  it('includes a closing synthesis line naming the first and last archetype', () => {
    const body = renderGistBody('seuthootDev', 'Jung Seunghoon', sampleYears, sampleMetrics);
    expect(body).toMatch(/Explorer/);
    expect(body).toMatch(/Builder/);
  });

  it('includes a per-year breakdown table with languages, repos, commit consistency, and PR/review/star data', () => {
    const body = renderGistBody('seuthootDev', 'Jung Seunghoon', sampleYears, sampleMetrics);
    // 2023: dominant language Python, 3 active repos, 180 commit days, 30-day streak, 5 own PRs
    expect(body).toMatch(/2023.*Python.*3.*180.*30.*5/s);
    // 2025: external PRs and reviews show up in the same row
    expect(body).toMatch(/2025.*7.*2/s);
  });
});
