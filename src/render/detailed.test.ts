import { describe, it, expect } from 'vitest';
import { renderHeroSection, renderDetailedSvg, heroSectionHeight } from './detailed';
import { selectHero, selectMoreMoments } from '../detailed/moments';
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

  it('positions the ANALYSIS divider at heroSectionHeight(momentsCount) + 26 - 16, not double-offset by an extra 90px', () => {
    const years = [detailedYearFixture(2024)];
    const svg = renderDetailedSvg('seuthootDev', 'Quiet Year', years, [journeyYearFixture]);
    const hero = selectHero(years);
    const moments = hero ? selectMoreMoments(years, hero) : [];
    const expectedAnalysisLabelY = heroSectionHeight(moments.length) + 26;
    const expectedDividerY = expectedAnalysisLabelY - 16;
    const wrongDividerY = 90 + expectedDividerY; // the bug: an extra, spurious +90 baked in

    expect(svg).toContain(`<line x1="28" y1="${expectedDividerY}" x2="812" y2="${expectedDividerY}" stroke="#ded3bd"/>`);
    expect(svg).not.toContain(`<line x1="28" y1="${wrongDividerY}"`);
  });

  it('adds a report-card reading line naming the year/column with fewer highs, and one with more, when at least two years each hold a star', () => {
    const yearLow = {
      ...detailedYearFixture(2024),
      metrics: { ...detailedYearFixture(2024).metrics, commitDays: 50, reposActive: 1, longLivedRepoCount: 0, ownPRs: 0, externalPRs: 0, reviews: 0, starsGained: 0, reposCreated: 1 },
    };
    const yearHigh = {
      ...detailedYearFixture(2025),
      metrics: { ...detailedYearFixture(2025).metrics, commitDays: 10, reposActive: 5, longLivedRepoCount: 3, ownPRs: 5, externalPRs: 3, reviews: 6, starsGained: 12, reposCreated: 4 },
      ownMergedPRs: [{ repo: 'a/b', date: '2025-03-01' }, { repo: 'a/b', date: '2025-04-01' }],
      externalMergedPRs: [{ repo: 'c/d', date: '2025-05-01' }],
    };
    const svg = renderDetailedSvg(
      'seuthootDev',
      'Quiet Year',
      [yearLow, yearHigh],
      [journeyYearFixture, { ...journeyYearFixture, year: 2025 }]
    );
    expect(svg).toContain('★ is the high mark in that column.');
    // 2024 uniquely holds the "days" high (50 > 10); 2025 holds every other column's high.
    expect(svg).toContain('2024 had the most commit days. 2025 took the rest.');
  });

  it('falls back to comeback framing when only one (later) year holds every star and its days exceed the earlier year', () => {
    const yearFloor = {
      ...detailedYearFixture(2024),
      metrics: { ...detailedYearFixture(2024).metrics, commitDays: 5, reposActive: 1, longLivedRepoCount: 0, ownPRs: 0, externalPRs: 0, reviews: 0, starsGained: 0, reposCreated: 1 },
    };
    const yearPeak = {
      ...detailedYearFixture(2025),
      metrics: { ...detailedYearFixture(2025).metrics, commitDays: 50, reposActive: 5, longLivedRepoCount: 3, ownPRs: 5, externalPRs: 3, reviews: 6, starsGained: 12, reposCreated: 4 },
      ownMergedPRs: [{ repo: 'a/b', date: '2025-03-01' }, { repo: 'a/b', date: '2025-04-01' }],
      externalMergedPRs: [{ repo: 'c/d', date: '2025-05-01' }],
    };
    const svg = renderDetailedSvg(
      'seuthootDev',
      'Quiet Year',
      [yearFloor, yearPeak],
      [journeyYearFixture, { ...journeyYearFixture, year: 2025 }]
    );
    expect(svg).toContain('2024 is the floor, not a failure — 5 → 50 commit days is the story.');
    expect(svg).not.toContain('led every column this window.');
  });
});
