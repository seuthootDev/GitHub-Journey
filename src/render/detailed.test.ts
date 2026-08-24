import { describe, it, expect } from 'vitest';
import { renderHeroSection, renderDetailedSvg, heroSectionHeight, buildChartSpecs } from './detailed';
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

  it('renders the cumulative sentence (and moments) even when hero is null, without the polaroid/THE START/name block', () => {
    const svg = renderHeroSection(
      null,
      [{ date: '2024-03-05', name: '2024-03-05', why: 'first contribution day' }],
      ['You showed up 12 days in 1 years.', '12 public repos. 0 lived past a year.']
    );
    expect(svg).toContain('You showed up 12 days in 1 years.');
    expect(svg).toContain('MORE MOMENTS');
    expect(svg).toContain('first contribution day');
    expect(svg).not.toContain('THE START');
    expect(svg).not.toContain('the floor this whole story climbs from');
  });

  it('escapes hero.date and moment date fields (defense in depth, consistent with every other data-derived field)', () => {
    const svg = renderHeroSection(
      { date: '2024-09-01<script>', name: 'x' },
      [{ date: '2024-03-05<b>', name: 'y', why: 'z' }],
      ['line1', 'line2']
    );
    expect(svg).not.toContain('<script>');
    expect(svg).not.toContain('<b>');
    expect(svg).toContain('&lt;script&gt;');
    expect(svg).toContain('&lt;b&gt;');
  });
});

describe('heroSectionHeight', () => {
  it('returns a smaller height when there is no hero block (hasHero=false) than when there is (hasHero=true), for the same moments count', () => {
    expect(heroSectionHeight(0, false)).toBeLessThan(heroSectionHeight(0, true));
    expect(heroSectionHeight(2, false)).toBeLessThan(heroSectionHeight(2, true));
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
    ownMergedCount: 0,
    externalMergedCount: 0,
    ownPROpenedEvents: [],
    externalPROpenedEvents: [],
    starEvents: [],
    reviewEvents: [],
    issueEvents: [],
    commitDayDates: [`${year}-09-05`],
    firstContributionDay: `${year}-09-05`,
  };
}

function reportCardHeaderOffset(svg: string): number {
  const tableTop = Number(svg.match(/<rect x="28" y="(\d+)" width="784" height="\d+" rx="6" fill="#fffdf8"/)?.[1]);
  const headerY = Number(svg.match(/<text x="40" y="(\d+)" text-anchor="start" font-size="11" font-weight="600" fill="#78716c">Year</)?.[1]);
  return headerY - tableTop;
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
    const moments = selectMoreMoments(years, hero);
    const expectedAnalysisLabelY = heroSectionHeight(moments.length, hero !== null) + 26;
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
      ownMergedCount: 2,
      externalMergedCount: 1,
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
      ownMergedCount: 2,
      externalMergedCount: 1,
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

  it('does not crash on a 0-year window, and the report card reading falls back to an empty second line', () => {
    const svg = renderDetailedSvg('seuthootDev', 'Quiet Year', [], []);
    expect(svg).toContain('<svg');
    expect(svg).toContain('★ is the high mark in that column.');
  });

  it('never names a column as "had the most X" when the fewer-highs year only tied for that high (regression: false claim on a tie)', () => {
    // 3 years: 2025 sweeps almost every column outright. 2024 and 2026 each hold exactly one
    // high — reposCreated — but TIED with each other (5 each, vs 2025's 1). Before the fix,
    // "the year with fewer highs" (2024) would be named as having "had the most repos
    // created", which is false since 2026 tied it. The fallback comeback framing must fire
    // instead of that false claim.
    const yearLow = {
      ...detailedYearFixture(2024),
      metrics: {
        ...detailedYearFixture(2024).metrics,
        commitDays: 5,
        reposActive: 1,
        longLivedRepoCount: 0,
        ownPRs: 0,
        externalPRs: 0,
        reviews: 0,
        starsGained: 0,
        reposCreated: 5,
      },
    };
    const yearSweep = {
      ...detailedYearFixture(2025),
      metrics: {
        ...detailedYearFixture(2025).metrics,
        commitDays: 100,
        reposActive: 9,
        longLivedRepoCount: 5,
        ownPRs: 10,
        externalPRs: 10,
        reviews: 5,
        starsGained: 20,
        reposCreated: 1,
      },
      ownMergedCount: 3,
      externalMergedCount: 3,
    };
    const yearTiedLow = {
      ...detailedYearFixture(2026),
      metrics: {
        ...detailedYearFixture(2026).metrics,
        commitDays: 50,
        reposActive: 1,
        longLivedRepoCount: 0,
        ownPRs: 0,
        externalPRs: 0,
        reviews: 0,
        starsGained: 0,
        reposCreated: 5,
      },
    };
    const svg = renderDetailedSvg(
      'seuthootDev',
      'Quiet Year',
      [yearLow, yearSweep, yearTiedLow],
      [journeyYearFixture, { ...journeyYearFixture, year: 2025 }, { ...journeyYearFixture, year: 2026 }]
    );
    expect(svg).not.toContain('had the most repos created');
    // Falls back to comeback framing (the floor -> peak commit-days story) instead of a false tie claim.
    expect(svg).toContain('2024 is the floor, not a failure — 5 → 50 commit days is the story.');
  });

  it('produces a two-line cumulative sentence with the commit-days line even when there are 0 repos (no hero)', () => {
    const noRepoYear: DetailedYearData = {
      ...detailedYearFixture(2024),
      repos: [],
      commitDayDates: ['2024-03-01', '2024-03-02'],
      firstContributionDay: '2024-03-01',
      metrics: { ...detailedYearFixture(2024).metrics, commitDays: 2, reposCreated: 0 },
    };
    const svg = renderDetailedSvg('seuthootDev', 'Quiet Year', [noRepoYear], [journeyYearFixture]);
    expect(svg).toContain('You showed up 2 days in 1 years.');
    expect(svg).not.toContain('THE START');
  });

  it('renders a small year-tick label for each window year on the chart x-axis (font-size 8 is unique to these ticks — distinct from the report card\'s year column)', () => {
    const svg = renderDetailedSvg(
      'seuthootDev',
      'Quiet Year',
      [detailedYearFixture(2024), detailedYearFixture(2025)],
      [journeyYearFixture, { ...journeyYearFixture, year: 2025 }]
    );
    expect(svg).toContain('font-size="8" fill="#8a8175">2024<');
    expect(svg).toContain('font-size="8" fill="#8a8175">2025<');
  });
});

describe('buildChartSpecs REPOS CREATED (regression: production shape has the SAME full repo list on every year)', () => {
  it('counts each repo once across the window, not once per year it appears in', () => {
    // Production shape: the fetch layer does not year-scope `repos` — every year object in
    // the window carries the SAME full account repo list. Only 3 distinct repos exist here,
    // created in different years; the bug counted them 3x (once per year in a 3-year window).
    const sharedRepos = [
      { name: 'repo-2023', createdAt: '2023-05-01T00:00:00Z', pushedAt: '2023-05-01T00:00:00Z' },
      { name: 'repo-2024', createdAt: '2024-06-01T00:00:00Z', pushedAt: '2024-06-01T00:00:00Z' },
      { name: 'repo-2025', createdAt: '2025-07-01T00:00:00Z', pushedAt: '2025-07-01T00:00:00Z' },
    ];
    const years: DetailedYearData[] = [2023, 2024, 2025].map((year) => ({
      ...detailedYearFixture(year),
      repos: sharedRepos, // identical array reference/content on every year, as in production
    }));
    const specs = buildChartSpecs(years);
    const reposCreatedSpec = specs.find((s) => s.label === 'REPOS CREATED')!;
    const totalBucketed = reposCreatedSpec.values.reduce((a, b) => a + b, 0);
    expect(totalBucketed).toBe(3); // distinct repos, not 3 repos * 3 years = 9
  });
});

describe('buildChartSpecs REVIEWS + ISSUES', () => {
  it('plots review and issue events at their correct month index instead of leaving the chart empty', () => {
    const years: DetailedYearData[] = [
      { ...detailedYearFixture(2024), reviewEvents: [{ repo: 'a/lib', date: '2024-03-15T00:00:00Z' }] },
      { ...detailedYearFixture(2025), issueEvents: [{ repo: 'b/proj', date: '2025-06-01T00:00:00Z' }] },
    ];
    const specs = buildChartSpecs(years);
    const spec = specs.find((s) => s.label === 'REVIEWS + ISSUES')!;
    expect(spec.kind).toBe('events');
    expect(spec.events).toEqual([
      { index: 2, type: 'review' }, // March 2024
      { index: 17, type: 'issue' }, // June 2025
    ]);
  });
});

describe('fade-in classes', () => {
  it('gives the ANALYSIS divider, each chart row, the report card, and year notes their own fade group', () => {
    const svg = renderDetailedSvg('seuthootDev', 'Quiet Year', [detailedYearFixture(2024)], [journeyYearFixture]);
    expect(svg).toContain('class="divider-fade"');
    expect(svg).toContain('class="chart-fade row0"');
    expect(svg).toContain('class="chart-fade row1"');
    expect(svg).toContain('class="chart-fade row2"');
    expect(svg).toContain('class="chart-fade row3"'); // 7 charts -> solo 4th row
    expect(svg).toContain('class="reportcard-fade"');
    expect(svg).toContain('class="notes-fade"');
  });

  it('gives every one of up to 8 More Moments its own fade-delay class', () => {
    const year: DetailedYearData = {
      ...detailedYearFixture(2026),
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
      firstContributionDay: '2020-06-15',
      repos: [
        { name: 'seuthootDev', createdAt: '2019-01-01T00:00:00Z', pushedAt: '2019-01-01T00:00:00Z' },
        { name: 'x/long-lived', createdAt: '2024-06-01T00:00:00Z', pushedAt: '2026-06-01T00:00:00Z' },
      ],
      commitDayDates: ['2026-04-01', '2026-04-02'],
    };
    const svg = renderDetailedSvg('seuthootDev', 'Quiet Year', [year], [{ ...journeyYearFixture, year: 2026 }]);
    for (let i = 0; i < 8; i++) {
      expect(svg).toContain(`class="moment-fade m${i}"`);
    }
  });
});

describe('report card header alignment (regression: header was rendering 16px too high, flush against the top border)', () => {
  it('positions the header text 19px inside the report card box top, not flush against it', () => {
    const svg = renderDetailedSvg('seuthootDev', 'Quiet Year', [detailedYearFixture(2024)], [journeyYearFixture]);
    expect(reportCardHeaderOffset(svg)).toBe(19);
  });

  it('keeps each data row exactly one row-height (28px) below the header, so the whole table stays evenly spaced', () => {
    const svg = renderDetailedSvg('seuthootDev', 'Quiet Year', [detailedYearFixture(2024)], [journeyYearFixture]);
    const headerY = Number(svg.match(/<text x="40" y="(\d+)" text-anchor="start"[^>]*>Year</)?.[1]);
    const firstRowY = Number(svg.match(/<text x="40" y="(\d+)" text-anchor="start" font-size="12" fill="#1c1917">2024</)?.[1]);
    expect(firstRowY - headerY).toBe(28);
  });
});

describe('chart peak-value labels', () => {
  it('labels the highest points on a line chart with their actual values', () => {
    const year: DetailedYearData = {
      ...detailedYearFixture(2024),
      commitDayDates: ['2024-01-05', '2024-01-06', '2024-01-07', '2024-06-01'],
    };
    const svg = renderDetailedSvg('seuthootDev', 'Quiet Year', [year], [journeyYearFixture]);
    // CONTRIBUTIONS chart (green, #2f8a4e) peaks at 3 commit days in January.
    expect(svg).toMatch(/fill="#2f8a4e">3</);
  });

  it('labels the rising edge of a plateau only once, not every adjacent month tied at the same value', () => {
    // Three consecutive months at the cumulative max (a common shape for a cumulative-stars
    // chart once new stars stop arriving) should produce exactly one peak label, not three.
    const year: DetailedYearData = {
      ...detailedYearFixture(2024),
      starEvents: [
        { repo: 'a', starredAt: '2024-01-05T00:00:00Z' },
        { repo: 'a', starredAt: '2024-01-10T00:00:00Z' },
      ],
    };
    const svg = renderDetailedSvg('seuthootDev', 'Quiet Year', [year], [journeyYearFixture]);
    const starLabelMatches = svg.match(/fill="#c9971f">2</g);
    expect(starLabelMatches?.length).toBe(1);
  });

  it('labels the tallest bars on the REPOS CREATED chart with their actual values', () => {
    const year: DetailedYearData = {
      ...detailedYearFixture(2024),
      repos: [
        { name: 'a', createdAt: '2024-01-01T00:00:00Z', pushedAt: '2024-01-01T00:00:00Z' },
        { name: 'b', createdAt: '2024-01-15T00:00:00Z', pushedAt: '2024-01-15T00:00:00Z' },
      ],
    };
    const svg = renderDetailedSvg('seuthootDev', 'Quiet Year', [year], [journeyYearFixture]);
    expect(svg).toMatch(/fill="#7c4fd1">2</);
  });
});

describe('REVIEWS + ISSUES rendering', () => {
  it('draws a circle for each review and a square for each issue, and captions real counts', () => {
    const year: DetailedYearData = {
      ...detailedYearFixture(2024),
      reviewEvents: [{ repo: 'a/lib', date: '2024-03-01T00:00:00Z' }],
      issueEvents: [{ repo: 'c/proj', date: '2024-05-01T00:00:00Z' }],
    };
    const svg = renderDetailedSvg('seuthootDev', 'Quiet Year', [year], [journeyYearFixture]);
    expect(svg).toContain('fill="#3a7fd6"'); // review circle color
    expect(svg).toContain('fill="#d1453d"'); // issue square color
    expect(svg).toContain('1 reviews, 1 issues across the window.');
  });

  it('renders no dots and a zero caption when there are no review/issue events, instead of crashing', () => {
    const svg = renderDetailedSvg('seuthootDev', 'Quiet Year', [detailedYearFixture(2024)], [journeyYearFixture]);
    expect(svg).toContain('0 reviews, 0 issues across the window.');
  });
});
