import { describe, it, expect } from 'vitest';
import { renderHeroSection, renderDetailedSvg } from './detailed';
import type { DetailedYearData } from '../detailed/types';
import type { JourneyYear } from '../types';

describe('renderHeroSection', () => {
  it('renders the hero name at hero scale and the cumulative sentence beneath it', () => {
    const svg = renderHeroSection(
      { date: '2024-09-01', name: 'seuthootDev' },
      [{ date: '2025-07-03', name: 'a/hanghae99-backend-week1', why: 'first own PR merged' }],
      ['You showed up 241 days in 3 years.', '124 pull requests opened, 106 merged — 23 in someone else’s repo.']
    );
    expect(svg).toContain('font-size="30" font-weight="700" fill="#1c1917">seuthootDev<');
    expect(svg).toContain('You showed up 241 days in 3 years.');
    expect(svg).toContain('2025-07-03');
    expect(svg).toContain('first own PR merged');
  });

  it('omits the More Moments label entirely when there are no moments (spec: skip the slot, no filler)', () => {
    const svg = renderHeroSection({ date: '2024-09-01', name: 'x' }, [], ['line1', 'line2']);
    expect(svg).not.toContain('MORE MOMENTS');
  });

  it('never uses a dark background or colored text — only warm paper tokens', () => {
    const svg = renderHeroSection({ date: '2024-09-01', name: 'x' }, [], ['line1', 'line2']);
    expect(svg).not.toMatch(/#0d1117|#161b22|#c9d1d9/); // old dark-theme tokens must not appear
  });
});

function detailedYearFixture(year: number): DetailedYearData {
  return {
    year,
    metrics: {
      year,
      languageBytes: { TypeScript: 100 },
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
    },
    repos: [{ name: 'seuthootDev', createdAt: `${year}-09-01T00:00:00Z`, pushedAt: `${year}-09-01T00:00:00Z` }],
    ownMergedPRs: [],
    externalMergedPRs: [],
    ownPROpenedEvents: [],
    externalPROpenedEvents: [],
    starEvents: [],
    commitDayDates: [`${year}-09-05`],
    firstContributionDay: `${year}-09-05`,
  };
}

const journeyYearFixture: JourneyYear = {
  year: 2024,
  archetype: 'Quiet Year',
  reason: { kind: 'metric', icon: '💤', text: 'low activity' },
  isCurrent: true,
  sameLanguageStreakYears: 1,
};

describe('renderDetailedSvg', () => {
  it('produces a well-formed single-root SVG with the paper background and no dark-theme colors', () => {
    const svg = renderDetailedSvg('seuthootDev', 'Quiet Year', [detailedYearFixture(2024)], [journeyYearFixture]);
    expect(svg.trim().startsWith('<svg')).toBe(true);
    expect(svg.trim().endsWith('</svg>')).toBe(true);
    expect(svg).toContain('#faf3e6');
    expect(svg).not.toMatch(/#0d1117|#161b22/);
  });

  it('lays out 7 charts as 3 rows of 2 plus a solo full-width row', () => {
    const svg = renderDetailedSvg('seuthootDev', 'Quiet Year', [detailedYearFixture(2024)], [journeyYearFixture]);
    expect(svg).toContain('CONTRIBUTIONS');
    expect(svg).toContain('COMMIT DAYS');
    expect(svg).toContain('PULL REQUESTS');
    expect(svg).toContain('MERGED PRs');
    expect(svg).toContain('REPOS CREATED');
    expect(svg).toContain('STARS');
    expect(svg).toContain('REVIEWS + ISSUES');
  });

  it('includes the report card with a star mark only on a positive column max', () => {
    const svg = renderDetailedSvg('seuthootDev', 'Quiet Year', [detailedYearFixture(2024)], [journeyYearFixture]);
    expect(svg).toContain('REPORT CARD');
    // Anchored on '>' so this only matches a text node whose content is exactly "0"
    // (not, say, the trailing 0 of a legitimately-starred "10").
    expect(svg).not.toMatch(/>0<tspan[^>]*>&#x2605;/); // never a star on a zero
  });

  it('includes one year-note block per year, in card order', () => {
    const svg = renderDetailedSvg(
      'seuthootDev',
      'Quiet Year',
      [detailedYearFixture(2024), detailedYearFixture(2025)],
      [journeyYearFixture, { ...journeyYearFixture, year: 2025 }]
    );
    expect(svg.indexOf('2024 Quiet Year')).toBeLessThan(svg.indexOf('2025 Quiet Year'));
  });
});
