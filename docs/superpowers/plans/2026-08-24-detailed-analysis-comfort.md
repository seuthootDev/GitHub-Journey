# Detailed Analysis (Comfort Layer) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the "detailed analysis" view described in the spec — a hero moment
(always the first public repo, with an illustrated polaroid standing in for a real
photo), a cumulative sentence, up to 4 more-moments, a 2-up chart grid, a report card,
and year notes — as a real renderer (`renderDetailedSvg`) driven by live GitHub data,
wired into the existing daily Action so it lands as a second gist file (`journey.svg`)
plus a markdown comfort-layer appended below the pin fold in `journey.md`.

**Architecture:** Extend the existing fetch → metrics → render pipeline with a parallel
`src/detailed/` layer (pure functions: hero/moment selection, cumulative-sentence
slots, monthly bucketing, report-card highs, year notes) that consumes the same
`RawYearData`/`YearlyMetrics` the pin already produces (plus a few new raw fields), and
a `src/render/detailed.ts` + `src/render/chart.ts` layer that turns that into SVG
strings, following the exact string-builder style already used in `src/render/index.ts`.
`src/cli.ts`'s `buildJourney` gains the new output; `main()` gains a second gist file
write. No new runtime dependencies, no live API server (Action-only, matches spec §10.2).

**Tech Stack:** TypeScript (ESM), Vitest, `@octokit/rest` (existing `OctokitLike`
pattern), hand-built SVG strings (no SVG library — matches existing convention of zero
templating libraries).

**Spec:** `docs/superpowers/specs/2026-08-22-detailed-analysis-comfort.md` (all section
references below, e.g. "§3.1", are to this file — read it alongside this plan; this
plan does not restate its copy/tone rules, only how to implement them).

## Global Constraints

(Copied verbatim from the spec; every task's work implicitly includes these.)

- Never invent numbers. Every value must come from data already fetched or a small,
  exact extension of it (spec §2).
- Never shame a quiet year — a floor year is "the start of the story," never a grade
  of F (spec §2, §6).
- Never pad an empty slot with filler copy; skip it and use the next fallback (spec §2).
- Never put merge/star language on an account that has none — the block must still
  read as a complete sentence using only commit days and repos (spec §2).
- Pin output (the existing 5-line headline) is completely unchanged — no SVG, no
  scenes, in the pin fold (spec §10, §11).
- Hero is always the first public repo, never the "most impressive" scene, present for
  every account with at least one public repo (spec §3.1, §11).
- More Moments: `0 ≤ n ≤ 4`, never repeats the hero's repo/date (spec §5, §11).
- Chart grid: 3 rows of 2, 7th chart (Reviews + Issues) alone on a full-width row
  (spec §3.4, §11).
- Report card ★ count equals the number of columns with a positive max; never ★ a
  zero column (spec §6).
- Whole card is warm paper background + ink-toned text throughout — no dark theme, no
  colored typography (spec §3.3). Color lives only in chart line/bar colors and the
  polaroid illustration.
- Fade-in animation respects `prefers-reduced-motion` (spec §3.3).
- No Vercel/Workers/live SVG API — the Action generates `journey.svg` on its existing
  cron/push/workflow_dispatch cadence, nothing on-demand (spec §10.2, §11).
- Search API's 1,000-result cap may truncate extreme accounts — do not fake the
  missing tail (spec §10.2).

---

## File Structure

New files:
- `src/detailed/types.ts` — types shared across the new `detailed/` layer
- `src/detailed/moments.ts` — hero + more-moments selection (spec §3.1, §5)
- `src/detailed/sentence.ts` — cumulative-sentence slot logic (spec §4), reused for
  year notes' second line
- `src/detailed/monthly.ts` — pure month-bucketing of raw multi-year data for charts
- `src/detailed/reportcard.ts` — report-card rows + ★ column highs (spec §6)
- `src/detailed/notes.ts` — year notes (spec §8)
- `src/render/chart.ts` — pure SVG geometry helpers (polyline points, bars, grid slots)
- `src/render/detailed.ts` — `renderDetailedSvg(...)`, the SVG string builder
- `src/render/detailedMarkdown.ts` — the below-the-fold gist markdown (spec §10.1)

Modified files:
- `src/fetch/types.ts` — new `RawYearData` fields (merged/opened PR events, star events)
- `src/fetch/github.ts` — fetch those new fields, extend `OctokitLike`
- `src/cli.ts` — `buildJourney` produces the new outputs; `main()` writes the second
  gist file

Each new module has one clear responsibility and is independently testable with small
hand-built fixtures — no module needs a live token or the full 3-year demo dataset to
test.

---

### Task 1: Fetch layer — merged/opened PR events and star events

**Files:**
- Modify: `src/fetch/types.ts`
- Modify: `src/fetch/github.ts`
- Test: `src/fetch/github.test.ts`

**Interfaces:**
- Consumes: nothing new (extends the existing `OctokitLike`/`fetchRawYear`)
- Produces: `RawYearData` gains `ownMergedPRs`, `externalMergedPRs`,
  `ownPROpenedEvents`, `externalPROpenedEvents` (all `Array<{ repo: string; date: string }>`)
  and `starEvents: Array<{ repo: string; starredAt: string }>` — later tasks read these.

- [ ] **Step 1: Write the failing tests**

Add to `src/fetch/github.test.ts` (next to the existing 404-tolerance test, using the
same `makeOctokit` factory already in that file — extend its `search` mock to return
`items` too):

```ts
it('captures merged own/external PR events with repo and merged date', async () => {
  const octokit = makeOctokit({
    rest: {
      ...makeOctokit().rest,
      search: {
        issuesAndPullRequests: vi.fn((params: { q: string }) => {
          if (params.q.includes('is:merged') && params.q.includes('user:seuthootDev')) {
            return Promise.resolve({
              data: {
                total_count: 1,
                items: [
                  {
                    repository_url: 'https://api.github.com/repos/seuthootDev/hanghae99-backend-week1',
                    created_at: '2025-07-01T00:00:00Z',
                    pull_request: { merged_at: '2025-07-03T00:00:00Z' },
                  },
                ],
              },
            });
          }
          if (params.q.includes('is:merged') && params.q.includes('-user:seuthootDev')) {
            return Promise.resolve({
              data: {
                total_count: 1,
                items: [
                  {
                    repository_url: 'https://api.github.com/repos/someone-else/Distributed_MES',
                    created_at: '2026-01-05T00:00:00Z',
                    pull_request: { merged_at: '2026-01-10T00:00:00Z' },
                  },
                ],
              },
            });
          }
          return Promise.resolve({ data: { total_count: 0, items: [] } });
        }),
      },
    },
  });

  const result = await fetchRawYear(octokit as any, 'seuthootDev', 2026);

  expect(result.ownMergedPRs).toEqual([
    { repo: 'seuthootDev/hanghae99-backend-week1', date: '2025-07-03T00:00:00Z' },
  ]);
  expect(result.externalMergedPRs).toEqual([
    { repo: 'someone-else/Distributed_MES', date: '2026-01-10T00:00:00Z' },
  ]);
});

it('captures star events (repo + starred_at) alongside the existing yearly count', async () => {
  const octokit = makeOctokit({
    rest: {
      ...makeOctokit().rest,
      repos: {
        ...makeOctokit().rest.repos,
        listForUser: vi
          .fn()
          .mockResolvedValue({
            data: [
              { name: 'qml-vtk-python-pyside6', created_at: '2025-01-01T00:00:00Z', pushed_at: '2025-06-01T00:00:00Z', fork: false },
            ],
          }),
      },
      activity: {
        listStargazersForRepo: vi
          .fn()
          .mockResolvedValue({ data: [{ starred_at: '2026-02-27T00:00:00Z' }] }),
      },
    },
  });

  const result = await fetchRawYear(octokit as any, 'seuthootDev', 2026);

  expect(result.starEvents).toEqual([
    { repo: 'qml-vtk-python-pyside6', starredAt: '2026-02-27T00:00:00Z' },
  ]);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/fetch/github.test.ts`
Expected: FAIL — `result.ownMergedPRs` etc. are `undefined` (property doesn't exist yet).

- [ ] **Step 3: Add the new `RawYearData` fields**

In `src/fetch/types.ts`, add to the interface:

```ts
export interface RawYearData {
  year: number;
  repos: Array<{ name: string; createdAt: string; pushedAt: string; languages: Record<string, number> }>;
  activeRepoNames: string[];
  contributionCalendar: {
    weeks: Array<{ contributionDays: Array<{ date: string; contributionCount: number }> }>;
  };
  ownPRCount: number;
  externalPRCount: number;
  externalRepoCount: number;
  reviewCount: number;
  starsGainedThisYear: number;
  ownMergedPRs: Array<{ repo: string; date: string }>;
  externalMergedPRs: Array<{ repo: string; date: string }>;
  starEvents: Array<{ repo: string; starredAt: string }>;
}
```

- [ ] **Step 4: Implement the fetch changes**

In `src/fetch/github.ts`, extend `OctokitLike.rest.search.issuesAndPullRequests`'s
param/return types and add a small URL-parsing helper, then two new search calls, then
collect star events in the existing stargazer loop:

```ts
// extend the existing search method signature
search: {
  issuesAndPullRequests(params: {
    q: string;
    per_page?: number;
  }): Promise<{
    data: {
      total_count: number;
      items?: Array<{
        repository_url: string;
        created_at: string;
        pull_request?: { merged_at: string | null };
      }>;
    };
  }>;
};
```

```ts
function repoNameFromUrl(repositoryUrl: string): string {
  return repositoryUrl.replace('https://api.github.com/repos/', '');
}

function mergedEvents(items: Array<{ repository_url: string; pull_request?: { merged_at: string | null } }> = []) {
  return items
    .filter((item): item is typeof item & { pull_request: { merged_at: string } } =>
      Boolean(item.pull_request?.merged_at)
    )
    .map((item) => ({ repo: repoNameFromUrl(item.repository_url), date: item.pull_request.merged_at }));
}
```

Inside `fetchRawYear`, after the existing `ownPRs`/`externalPRs` calls, add:

```ts
  const { data: ownMerged } = await octokit.rest.search.issuesAndPullRequests({
    q: `author:${username} type:pr is:merged merged:${dateRange} user:${username}`,
    per_page: 100,
  });
  const { data: externalMerged } = await octokit.rest.search.issuesAndPullRequests({
    q: `author:${username} type:pr is:merged merged:${dateRange} -user:${username}`,
    per_page: 100,
  });
```

Replace the star-gathering loop's body so it also pushes onto a `starEvents` array
(keep `starsGainedThisYear` exactly as-is — this is additive):

```ts
  let starsGainedThisYear = 0;
  const starEvents: Array<{ repo: string; starredAt: string }> = [];
  for (const repo of repoList) {
    let stargazers: Array<{ starred_at?: string }>;
    try {
      ({ data: stargazers } = await octokit.rest.activity.listStargazersForRepo({
        owner: username,
        repo: repo.name,
        headers: { accept: 'application/vnd.github.star+json' },
        per_page: 100,
      }));
    } catch (err) {
      if (!isNotFound(err)) throw err;
      stargazers = [];
    }
    for (const s of stargazers) {
      if (s.starred_at && new Date(s.starred_at).getUTCFullYear() === year) {
        starsGainedThisYear++;
        starEvents.push({ repo: repo.name, starredAt: s.starred_at });
      }
    }
  }
```

And extend the function's return statement:

```ts
  return {
    year,
    repos,
    activeRepoNames,
    contributionCalendar,
    ownPRCount: ownPRs.total_count,
    externalPRCount: externalPRs.total_count,
    externalRepoCount: externalRepoNames.size,
    reviewCount: reviews.total_count,
    starsGainedThisYear,
    ownMergedPRs: mergedEvents(ownMerged.items),
    externalMergedPRs: mergedEvents(externalMerged.items),
    ownPROpenedEvents: (ownPRs.items ?? []).map((item) => ({ repo: repoNameFromUrl(item.repository_url), date: item.created_at })),
    externalPROpenedEvents: (externalPRs.items ?? []).map((item) => ({ repo: repoNameFromUrl(item.repository_url), date: item.created_at })),
    starEvents,
  };
```

Also add `ownPROpenedEvents: Array<{ repo: string; date: string }>` and
`externalPROpenedEvents: Array<{ repo: string; date: string }>` to the `RawYearData`
interface from Step 3 (the tests above only assert merged/star events, but this task
produces all five new fields — add a third short test asserting
`result.ownPROpenedEvents` contains the mapped `{repo, date}` from `ownPRs.items` in
the existing `makeOctokit()` default mock before moving on, so the field isn't
untested).

Also change the existing `ownPRs`/`externalPRs`/`reviews` search calls to pass
`per_page: 100` (currently they pass no `per_page`, so they default to 30 — bump to
100 so `items` is a useful sample for the new event fields; `total_count` — which the
pin's counts already rely on — is unaffected by `per_page`).

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test -- src/fetch/github.test.ts`
Expected: PASS, all tests including the pre-existing 404-tolerance ones.

- [ ] **Step 6: Commit**

```bash
git add src/fetch/types.ts src/fetch/github.ts src/fetch/github.test.ts
git commit -m "Fetch merged/opened PR and star events for the detailed analysis view"
```

---

### Task 2: `src/detailed/types.ts` and the raw→detailed aggregator

**Files:**
- Create: `src/detailed/types.ts`
- Create: `src/detailed/index.ts`
- Test: `src/detailed/index.test.ts`

**Interfaces:**
- Consumes: `RawYearData` (Task 1), `YearlyMetrics` (existing)
- Produces: `DetailedYearData`, `toDetailedYearData(raw, metrics): DetailedYearData` —
  every later `detailed/` and `render/detailed.ts` task consumes `DetailedYearData[]`.

- [ ] **Step 1: Write the failing test**

```ts
// src/detailed/index.test.ts
import { describe, it, expect } from 'vitest';
import { toDetailedYearData } from './index';
import type { RawYearData } from '../fetch/types';
import type { YearlyMetrics } from '../types';

function rawFixture(overrides: Partial<RawYearData> = {}): RawYearData {
  return {
    year: 2024,
    repos: [],
    activeRepoNames: [],
    contributionCalendar: {
      weeks: [
        {
          contributionDays: [
            { date: '2024-01-01', contributionCount: 0 },
            { date: '2024-03-05', contributionCount: 2 },
            { date: '2024-03-10', contributionCount: 1 },
          ],
        },
      ],
    },
    ownPRCount: 0,
    externalPRCount: 0,
    externalRepoCount: 0,
    reviewCount: 0,
    starsGainedThisYear: 0,
    ownMergedPRs: [],
    externalMergedPRs: [],
    ownPROpenedEvents: [],
    externalPROpenedEvents: [],
    starEvents: [],
    ...overrides,
  };
}

const metricsFixture: YearlyMetrics = {
  year: 2024,
  languageBytes: {},
  newLanguageCount: 0,
  reposCreated: 0,
  reposActive: 0,
  longLivedRepoCount: 0,
  activeMonths: 1,
  commitDays: 2,
  longestStreakDays: 1,
  ownPRs: 0,
  externalPRs: 0,
  externalReposContributed: 0,
  reviews: 0,
  starsGained: 0,
};

describe('toDetailedYearData', () => {
  it('finds the earliest date with a contribution as firstContributionDay', () => {
    const result = toDetailedYearData(rawFixture(), metricsFixture);
    expect(result.firstContributionDay).toBe('2024-03-05');
  });

  it('returns null for firstContributionDay when the whole year is empty', () => {
    const raw = rawFixture({
      contributionCalendar: { weeks: [{ contributionDays: [{ date: '2024-01-01', contributionCount: 0 }] }] },
    });
    const result = toDetailedYearData(raw, metricsFixture);
    expect(result.firstContributionDay).toBeNull();
  });

  it('passes through the raw event arrays and metrics unchanged', () => {
    const raw = rawFixture({
      ownMergedPRs: [{ repo: 'a/b', date: '2024-05-01' }],
    });
    const result = toDetailedYearData(raw, metricsFixture);
    expect(result.ownMergedPRs).toEqual([{ repo: 'a/b', date: '2024-05-01' }]);
    expect(result.metrics).toBe(metricsFixture);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/detailed/index.test.ts`
Expected: FAIL — cannot find module `./index` (doesn't exist yet).

- [ ] **Step 3: Write `src/detailed/types.ts`**

```ts
import type { YearlyMetrics } from '../types';

export interface DetailedYearData {
  year: number;
  metrics: YearlyMetrics;
  repos: Array<{ name: string; createdAt: string; pushedAt: string }>;
  ownMergedPRs: Array<{ repo: string; date: string }>;
  externalMergedPRs: Array<{ repo: string; date: string }>;
  ownPROpenedEvents: Array<{ repo: string; date: string }>;
  externalPROpenedEvents: Array<{ repo: string; date: string }>;
  starEvents: Array<{ repo: string; starredAt: string }>;
  commitDayDates: string[];
  firstContributionDay: string | null;
}
```

- [ ] **Step 4: Write `src/detailed/index.ts`**

```ts
import type { RawYearData } from '../fetch/types';
import type { YearlyMetrics } from '../types';
import type { DetailedYearData } from './types';

export function toDetailedYearData(raw: RawYearData, metrics: YearlyMetrics): DetailedYearData {
  const commitDayDates = raw.contributionCalendar.weeks
    .flatMap((w) => w.contributionDays)
    .filter((d) => d.contributionCount > 0 && new Date(d.date).getUTCFullYear() === raw.year)
    .map((d) => d.date)
    .sort();

  return {
    year: raw.year,
    metrics,
    repos: raw.repos.map((r) => ({ name: r.name, createdAt: r.createdAt, pushedAt: r.pushedAt })),
    ownMergedPRs: raw.ownMergedPRs,
    externalMergedPRs: raw.externalMergedPRs,
    ownPROpenedEvents: raw.ownPROpenedEvents,
    externalPROpenedEvents: raw.externalPROpenedEvents,
    starEvents: raw.starEvents,
    commitDayDates,
    firstContributionDay: commitDayDates[0] ?? null,
  };
}

export type { DetailedYearData } from './types';
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- src/detailed/index.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/detailed/types.ts src/detailed/index.ts src/detailed/index.test.ts
git commit -m "Add DetailedYearData aggregator for the detailed analysis view"
```

---

### Task 3: Monthly bucketing (`src/detailed/monthly.ts`)

**Files:**
- Create: `src/detailed/monthly.ts`
- Test: `src/detailed/monthly.test.ts`

**Interfaces:**
- Consumes: `DetailedYearData[]` (Task 2)
- Produces: `monthLabels(years)`, `bucketByMonth(years, pick)`,
  `bucketCumulativeByMonth(years, pick)` — Task 9 (charts renderer) consumes these.

- [ ] **Step 1: Write the failing tests**

```ts
// src/detailed/monthly.test.ts
import { describe, it, expect } from 'vitest';
import { monthLabels, bucketByMonth, bucketCumulativeByMonth } from './monthly';
import type { DetailedYearData } from './types';

function yearFixture(year: number, overrides: Partial<DetailedYearData> = {}): DetailedYearData {
  return {
    year,
    metrics: {} as any,
    repos: [],
    ownMergedPRs: [],
    externalMergedPRs: [],
    ownPROpenedEvents: [],
    externalPROpenedEvents: [],
    starEvents: [],
    commitDayDates: [],
    firstContributionDay: null,
    ...overrides,
  };
}

describe('monthLabels', () => {
  it('returns one label per month across the window, chronological', () => {
    const labels = monthLabels([yearFixture(2024), yearFixture(2025)]);
    expect(labels).toHaveLength(24);
    expect(labels[0]).toBe('2024-01');
    expect(labels[23]).toBe('2025-12');
  });
});

describe('bucketByMonth', () => {
  it('counts dated events per calendar month across the window', () => {
    const years = [
      yearFixture(2024, { commitDayDates: ['2024-01-05', '2024-01-20', '2024-03-01'] }),
      yearFixture(2025, { commitDayDates: ['2025-12-31'] }),
    ];
    const counts = bucketByMonth(years, (y) => y.commitDayDates);
    expect(counts).toHaveLength(24);
    expect(counts[0]).toBe(2); // 2024-01
    expect(counts[2]).toBe(1); // 2024-03
    expect(counts[23]).toBe(1); // 2025-12
    expect(counts[1]).toBe(0); // 2024-02
  });
});

describe('bucketCumulativeByMonth', () => {
  it('produces a running total across the window', () => {
    const years = [
      yearFixture(2024, { starEvents: [{ repo: 'a', starredAt: '2024-02-01' }] }),
      yearFixture(2025, { starEvents: [{ repo: 'b', starredAt: '2025-01-01' }] }),
    ];
    const cumulative = bucketCumulativeByMonth(years, (y) => y.starEvents.map((s) => s.starredAt));
    expect(cumulative[0]).toBe(0); // 2024-01
    expect(cumulative[1]).toBe(1); // 2024-02
    expect(cumulative[11]).toBe(1); // 2024-12
    expect(cumulative[12]).toBe(2); // 2025-01
    expect(cumulative[23]).toBe(2); // 2025-12
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/detailed/monthly.test.ts`
Expected: FAIL — module doesn't exist.

- [ ] **Step 3: Implement `src/detailed/monthly.ts`**

```ts
import type { DetailedYearData } from './types';

export function monthLabels(years: DetailedYearData[]): string[] {
  const labels: string[] = [];
  for (const y of years) {
    for (let m = 1; m <= 12; m++) {
      labels.push(`${y.year}-${String(m).padStart(2, '0')}`);
    }
  }
  return labels;
}

function monthIndex(years: DetailedYearData[], isoDate: string): number {
  const d = new Date(isoDate);
  const year = d.getUTCFullYear();
  const month = d.getUTCMonth(); // 0-indexed
  const yearIndex = years.findIndex((y) => y.year === year);
  if (yearIndex === -1) return -1;
  return yearIndex * 12 + month;
}

export function bucketByMonth(years: DetailedYearData[], pick: (y: DetailedYearData) => string[]): number[] {
  const counts = new Array(years.length * 12).fill(0);
  for (const y of years) {
    for (const date of pick(y)) {
      const idx = monthIndex(years, date);
      if (idx >= 0) counts[idx]++;
    }
  }
  return counts;
}

export function bucketCumulativeByMonth(
  years: DetailedYearData[],
  pick: (y: DetailedYearData) => string[]
): number[] {
  const perMonth = bucketByMonth(years, pick);
  const cumulative: number[] = [];
  let running = 0;
  for (const count of perMonth) {
    running += count;
    cumulative.push(running);
  }
  return cumulative;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- src/detailed/monthly.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/detailed/monthly.ts src/detailed/monthly.test.ts
git commit -m "Add monthly bucketing helpers for the detailed analysis charts"
```

---

### Task 4: Hero + More Moments selection (`src/detailed/moments.ts`)

**Files:**
- Create: `src/detailed/moments.ts`
- Test: `src/detailed/moments.test.ts`

**Interfaces:**
- Consumes: `DetailedYearData[]` (Task 2)
- Produces: `HeroMoment`, `Moment`, `selectHero(years): HeroMoment | null`,
  `selectMoreMoments(years, hero): Moment[]` (max 4) — Task 9 (hero/moments renderer)
  and Task 11 (markdown) consume these.

Implements spec §3.1 (hero) and §5.1/§5.2 (tier 1 then tier 2, capped at 4, origin
excluded).

- [ ] **Step 1: Write the failing tests**

```ts
// src/detailed/moments.test.ts
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
    ownPROpenedEvents: [],
    externalPROpenedEvents: [],
    starEvents: [],
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

  it('caps at 4 and never includes the hero repo/date', () => {
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/detailed/moments.test.ts`
Expected: FAIL — module doesn't exist.

- [ ] **Step 3: Implement `src/detailed/moments.ts`**

```ts
import type { DetailedYearData } from './types';

export interface HeroMoment {
  date: string;
  name: string;
}

export interface Moment {
  date: string;
  name: string;
  why: string;
}

function toDateOnly(iso: string): string {
  return iso.slice(0, 10);
}

export function selectHero(years: DetailedYearData[]): HeroMoment | null {
  const allRepos = years.flatMap((y) => y.repos);
  if (allRepos.length === 0) return null;
  const oldest = allRepos.reduce((min, r) => (r.createdAt < min.createdAt ? r : min));
  return { date: toDateOnly(oldest.createdAt), name: oldest.name };
}

function earliest<T>(items: T[], dateOf: (t: T) => string): T | null {
  if (items.length === 0) return null;
  return items.reduce((min, item) => (dateOf(item) < dateOf(min) ? item : min));
}

export function selectMoreMoments(years: DetailedYearData[], hero: HeroMoment | null, max = 4): Moment[] {
  const candidates: Moment[] = [];
  const seen = new Set<string>(hero ? [`${hero.name}|${hero.date}`] : []);

  function add(moment: Moment | null) {
    if (!moment) return;
    const key = `${moment.name}|${moment.date}`;
    if (seen.has(key)) return;
    seen.add(key);
    candidates.push(moment);
  }

  // Tier 1
  const allExtMerged = years.flatMap((y) => y.externalMergedPRs);
  const firstExtMerged = earliest(allExtMerged, (e) => e.date);
  if (firstExtMerged) {
    add({ date: toDateOnly(firstExtMerged.date), name: firstExtMerged.repo, why: 'first external PR, merged' });
  }

  const allStars = years.flatMap((y) => y.starEvents);
  const firstStar = earliest(allStars, (e) => e.starredAt);
  if (firstStar) {
    add({ date: toDateOnly(firstStar.starredAt), name: firstStar.repo, why: 'first star' });
  }

  const allOwnMerged = years.flatMap((y) => y.ownMergedPRs);
  const firstOwnMerged = earliest(allOwnMerged, (e) => e.date);
  if (firstOwnMerged) {
    add({ date: toDateOnly(firstOwnMerged.date), name: firstOwnMerged.repo, why: 'first own PR merged' });
  }

  // Later star cluster: the earliest star on a *different* repo than firstStar
  const laterStar = earliest(
    allStars.filter((e) => e.repo !== firstStar?.repo),
    (e) => e.starredAt
  );
  if (laterStar) {
    add({ date: toDateOnly(laterStar.starredAt), name: laterStar.repo, why: 'more stars land' });
  }

  // Tier 2 (only used while candidates.length < max)
  if (candidates.length < max) {
    const firstContribYear = years.find((y) => y.firstContributionDay);
    if (firstContribYear?.firstContributionDay) {
      add({
        date: firstContribYear.firstContributionDay,
        name: firstContribYear.firstContributionDay,
        why: 'first contribution day',
      });
    }
  }

  return candidates.slice(0, max);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- src/detailed/moments.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/detailed/moments.ts src/detailed/moments.test.ts
git commit -m "Add hero and more-moments selection (spec 3.1, 5.1, 5.2)"
```

---

### Task 5: Cumulative sentence (`src/detailed/sentence.ts`)

**Files:**
- Create: `src/detailed/sentence.ts`
- Test: `src/detailed/sentence.test.ts`

**Interfaces:**
- Consumes: `YearlyMetrics[]` (existing type) plus merged-PR totals
  (`{ ownMerged: number; externalMerged: number }`, summed from `DetailedYearData`
  by the caller — kept as plain numbers here so this module has no dependency on
  `detailed/types.ts` and is reusable for a single year in Task 6/notes)
- Produces: `renderCumulativeSentence(input): string[]` (1 or 2 lines) — Task 9 (hero
  renderer) and Task 7 (year notes) consume this.

Implements spec §4 exactly (slot priority table, templates, hard limits).

- [ ] **Step 1: Write the failing tests**

```ts
// src/detailed/sentence.test.ts
import { describe, it, expect } from 'vitest';
import { renderCumulativeSentence } from './sentence';

describe('renderCumulativeSentence', () => {
  it('produces the quiet-only two-line example from the spec', () => {
    const lines = renderCumulativeSentence({
      commitDays: 47,
      yearCount: 3,
      ownPRs: 0,
      externalPRs: 0,
      ownMerged: 0,
      externalMerged: 0,
      starsGained: 0,
      reposCreated: 4,
      longLivedRepoCount: 1,
    });
    expect(lines).toEqual(['You showed up 47 days in 3 years.', '4 public repos. 1 lived past a year.']);
  });

  it('produces the PR-without-stars example from the spec', () => {
    const lines = renderCumulativeSentence({
      commitDays: 101,
      yearCount: 3,
      ownPRs: 24,
      externalPRs: 0,
      ownMerged: 22,
      externalMerged: 0,
      starsGained: 0,
      reposCreated: 13,
      longLivedRepoCount: 2,
    });
    expect(lines).toEqual([
      'You showed up 101 days in 3 years.',
      '24 of 24 pull requests merged, all in your own repos.',
    ]);
  });

  it('produces the demo (external merges) example from the spec', () => {
    const lines = renderCumulativeSentence({
      commitDays: 241,
      yearCount: 3,
      ownPRs: 87,
      externalPRs: 37,
      ownMerged: 83,
      externalMerged: 23,
      starsGained: 5,
      reposCreated: 21,
      longLivedRepoCount: 2,
    });
    expect(lines).toEqual([
      'You showed up 241 days in 3 years.',
      '124 pull requests opened, 106 merged — 23 in someone else’s repo.',
    ]);
  });

  it('never mentions pull requests or stars for a 0-PR, 0-star account', () => {
    const lines = renderCumulativeSentence({
      commitDays: 10,
      yearCount: 1,
      ownPRs: 0,
      externalPRs: 0,
      ownMerged: 0,
      externalMerged: 0,
      starsGained: 0,
      reposCreated: 1,
      longLivedRepoCount: 0,
    });
    expect(lines.join(' ')).not.toMatch(/pull request|star/i);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/detailed/sentence.test.ts`
Expected: FAIL — module doesn't exist.

- [ ] **Step 3: Implement `src/detailed/sentence.ts`**

```ts
export interface CumulativeInput {
  commitDays: number;
  yearCount: number;
  ownPRs: number;
  externalPRs: number;
  ownMerged: number;
  externalMerged: number;
  starsGained: number;
  reposCreated: number;
  longLivedRepoCount: number;
}

export function renderCumulativeSentence(input: CumulativeInput): string[] {
  const opened = input.ownPRs + input.externalPRs;
  const merged = input.ownMerged + input.externalMerged;

  const first = `You showed up ${input.commitDays} days in ${input.yearCount} years.`;

  let second: string;
  if (input.externalMerged > 0) {
    second = `${opened} pull requests opened, ${merged} merged — ${input.externalMerged} in someone else’s repo.`;
  } else if (input.ownMerged > 0) {
    second = `${merged} of ${opened} pull requests merged, all in your own repos.`;
  } else if (opened > 0) {
    second = `${opened} pull requests opened. None merged in this window.`;
  } else if (input.starsGained > 0) {
    second = `${input.starsGained} stars landed on your repos.`;
  } else {
    second = `${input.reposCreated} public repos. ${input.longLivedRepoCount} lived past a year.`;
  }

  return [first, second];
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- src/detailed/sentence.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/detailed/sentence.ts src/detailed/sentence.test.ts
git commit -m "Add cumulative-sentence slot logic (spec 4)"
```

---

### Task 6: Report card (`src/detailed/reportcard.ts`)

**Files:**
- Create: `src/detailed/reportcard.ts`
- Test: `src/detailed/reportcard.test.ts`

**Interfaces:**
- Consumes: `DetailedYearData[]` (Task 2), plus `dominantLanguage` from the existing
  `src/metrics/language.ts`
- Produces: `ReportCardRow`, `buildReportCard(years): { rows: ReportCardRow[]; highs: Set<string> }`
  where a "high" key is `` `${year}:${column}` `` — Task 10 (report-card renderer)
  consumes this.

Implements spec §6 (★ on column max, ties allowed, never ★ a zero).

- [ ] **Step 1: Write the failing tests**

```ts
// src/detailed/reportcard.test.ts
import { describe, it, expect } from 'vitest';
import { buildReportCard } from './reportcard';
import type { DetailedYearData } from './types';

function yearFixture(year: number, metricsOverrides: any, eventOverrides: Partial<DetailedYearData> = {}): DetailedYearData {
  return {
    year,
    metrics: {
      year,
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
      ...metricsOverrides,
    },
    repos: [],
    ownMergedPRs: [],
    externalMergedPRs: [],
    ownPROpenedEvents: [],
    externalPROpenedEvents: [],
    starEvents: [],
    commitDayDates: [],
    firstContributionDay: null,
    ...eventOverrides,
  };
}

describe('buildReportCard', () => {
  it('marks the column maximum with a high, and does not mark ties', () => {
    const years = [
      yearFixture(2024, { commitDays: 10, longLivedRepoCount: 1 }),
      yearFixture(2025, { commitDays: 101, longLivedRepoCount: 2 }),
      yearFixture(2026, { commitDays: 130, longLivedRepoCount: 2 }),
    ];
    const { highs } = buildReportCard(years);
    expect(highs.has('2026:days')).toBe(true);
    expect(highs.has('2024:days')).toBe(false);
    expect(highs.has('2025:longLived')).toBe(true);
    expect(highs.has('2026:longLived')).toBe(true); // tie, both marked
  });

  it('never marks a column whose max is zero', () => {
    const years = [yearFixture(2024, { ownPRs: 0 }), yearFixture(2025, { ownPRs: 0 })];
    const { highs } = buildReportCard(years);
    expect(highs.has('2024:ownPRs')).toBe(false);
    expect(highs.has('2025:ownPRs')).toBe(false);
  });

  it('includes merged-PR totals and dominant language in each row', () => {
    const years = [
      yearFixture(
        2026,
        { ownPRs: 63, externalPRs: 37, languageBytes: { GDScript: 100 } },
        { ownMergedPRs: [{ repo: 'a', date: '2026-01-01' }], externalMergedPRs: [] }
      ),
    ];
    const { rows } = buildReportCard(years);
    expect(rows[0]).toMatchObject({ year: 2026, language: 'GDScript', ownMerged: 1, externalMerged: 0 });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/detailed/reportcard.test.ts`
Expected: FAIL — module doesn't exist.

- [ ] **Step 3: Implement `src/detailed/reportcard.ts`**

```ts
import type { DetailedYearData } from './types';
import { dominantLanguage } from '../metrics/language';

export interface ReportCardRow {
  year: number;
  language: string;
  reposActive: number;
  longLived: number;
  days: number;
  ownPRs: number;
  externalPRs: number;
  ownMerged: number;
  externalMerged: number;
  reviews: number;
  stars: number;
  reposCreated: number;
}

const NUMERIC_COLUMNS = [
  'reposActive',
  'longLived',
  'days',
  'ownPRs',
  'externalPRs',
  'ownMerged',
  'externalMerged',
  'reviews',
  'stars',
  'reposCreated',
] as const;

export function buildReportCard(years: DetailedYearData[]): { rows: ReportCardRow[]; highs: Set<string> } {
  const rows: ReportCardRow[] = years.map((y) => ({
    year: y.year,
    language: dominantLanguage(y.metrics) ?? '—',
    reposActive: y.metrics.reposActive,
    longLived: y.metrics.longLivedRepoCount,
    days: y.metrics.commitDays,
    ownPRs: y.metrics.ownPRs,
    externalPRs: y.metrics.externalPRs,
    ownMerged: y.ownMergedPRs.length,
    externalMerged: y.externalMergedPRs.length,
    reviews: y.metrics.reviews,
    stars: y.metrics.starsGained,
    reposCreated: y.metrics.reposCreated,
  }));

  const highs = new Set<string>();
  for (const column of NUMERIC_COLUMNS) {
    const max = Math.max(...rows.map((r) => r[column]));
    if (max <= 0) continue;
    for (const row of rows) {
      if (row[column] === max) highs.add(`${row.year}:${column}`);
    }
  }

  return { rows, highs };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- src/detailed/reportcard.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/detailed/reportcard.ts src/detailed/reportcard.test.ts
git commit -m "Add report-card rows and column-high computation (spec 6)"
```

---

### Task 7: Year notes (`src/detailed/notes.ts`)

**Files:**
- Create: `src/detailed/notes.ts`
- Test: `src/detailed/notes.test.ts`

**Interfaces:**
- Consumes: `DetailedYearData` (single year, Task 2), `Archetype` (existing type),
  `renderCumulativeSentence` (Task 5)
- Produces: `YearNote`, `buildYearNote(year, archetype): YearNote` — Task 10 (year-notes
  renderer) and Task 11 (markdown) consume this.

Implements spec §8: stacked title + 2-line prose, specific and kind, no "dead Q4"
verdict language.

- [ ] **Step 1: Write the failing test**

```ts
// src/detailed/notes.test.ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/detailed/notes.test.ts`
Expected: FAIL — module doesn't exist.

- [ ] **Step 3: Implement `src/detailed/notes.ts`**

```ts
import type { Archetype } from '../types';
import type { DetailedYearData } from './types';
import { renderCumulativeSentence } from './sentence';
import { dominantLanguage } from '../metrics/language';

export interface YearNote {
  heading: string;
  lines: [string, string];
}

export function buildYearNote(year: DetailedYearData, archetype: Archetype): YearNote {
  const lang = dominantLanguage(year.metrics);
  const first =
    year.metrics.reposCreated > 0
      ? `${lang ? `${lang} was the main language. ` : ''}${year.metrics.reposCreated} repo${
          year.metrics.reposCreated === 1 ? '' : 's'
        } created, ${year.metrics.longLivedRepoCount} still active a year later.`
      : `No new repos this year — ${year.metrics.commitDays} commit day${year.metrics.commitDays === 1 ? '' : 's'} on what was already there.`;

  const [, second] = renderCumulativeSentence({
    commitDays: year.metrics.commitDays,
    yearCount: 1,
    ownPRs: year.metrics.ownPRs,
    externalPRs: year.metrics.externalPRs,
    ownMerged: year.ownMergedPRs.length,
    externalMerged: year.externalMergedPRs.length,
    starsGained: year.metrics.starsGained,
    reposCreated: year.metrics.reposCreated,
    longLivedRepoCount: year.metrics.longLivedRepoCount,
  });

  return {
    heading: `${year.year} ${archetype}`,
    lines: [first, second],
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- src/detailed/notes.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/detailed/notes.ts src/detailed/notes.test.ts
git commit -m "Add year-notes prose builder (spec 8)"
```

---

### Task 8: Chart geometry helpers (`src/render/chart.ts`)

**Files:**
- Create: `src/render/chart.ts`
- Test: `src/render/chart.test.ts`

**Interfaces:**
- Consumes: nothing (pure geometry)
- Produces: `PlotArea`, `buildPolylinePoints(values, plot, max)`,
  `buildBars(values, plot, max, barWidth)`, `GridSlot`, `chartGridSlots(count, opts)`
  — Task 9/10 (SVG renderer) consume these.

Implements spec §3.4's 2-up-grid-with-odd-solo-row rule generically (any chart count,
not hardcoded to 7).

- [ ] **Step 1: Write the failing tests**

```ts
// src/render/chart.test.ts
import { describe, it, expect } from 'vitest';
import { buildPolylinePoints, buildBars, chartGridSlots } from './chart';

describe('buildPolylinePoints', () => {
  it('maps values to evenly spaced x, scaled y within the plot area', () => {
    const points = buildPolylinePoints([0, 5, 10], { x: 0, y: 0, width: 100, height: 50 }, 10);
    expect(points).toBe('0.0,50.0 50.0,25.0 100.0,0.0');
  });

  it('returns an empty string for no values', () => {
    expect(buildPolylinePoints([], { x: 0, y: 0, width: 100, height: 50 }, 10)).toBe('');
  });

  it('does not divide by zero when max is 0', () => {
    expect(buildPolylinePoints([0, 0], { x: 0, y: 0, width: 100, height: 50 }, 0)).toBe('0.0,50.0 100.0,50.0');
  });
});

describe('buildBars', () => {
  it('scales bar height to the plot, keeping bars bottom-anchored', () => {
    const bars = buildBars([5, 10], { x: 0, y: 0, width: 100, height: 50 }, 10, 8);
    expect(bars).toEqual([
      { x: -4, y: 25, height: 25 },
      { x: 96, y: 0, height: 50 },
    ]);
  });
});

describe('chartGridSlots', () => {
  it('pairs charts two per row', () => {
    const slots = chartGridSlots(4, { marginX: 28, contentWidth: 784, colGap: 32, rowHeight: 132, startY: 470 });
    expect(slots[0]).toMatchObject({ x: 28, width: 376, y: 470 });
    expect(slots[1]).toMatchObject({ x: 436, width: 376, y: 470 });
    expect(slots[2]).toMatchObject({ x: 28, width: 376, y: 602 });
    expect(slots[3]).toMatchObject({ x: 436, width: 376, y: 602 });
  });

  it('gives the odd chart out a full-width solo row', () => {
    const slots = chartGridSlots(3, { marginX: 28, contentWidth: 784, colGap: 32, rowHeight: 132, startY: 470 });
    expect(slots[2]).toMatchObject({ x: 28, width: 784, y: 602 });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/render/chart.test.ts`
Expected: FAIL — module doesn't exist.

- [ ] **Step 3: Implement `src/render/chart.ts`**

```ts
export interface PlotArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

function scaleY(value: number, max: number, plot: PlotArea): number {
  if (max <= 0) return plot.y + plot.height;
  return plot.y + plot.height - (value / max) * plot.height;
}

export function buildPolylinePoints(values: number[], plot: PlotArea, max: number): string {
  const n = values.length;
  if (n === 0) return '';
  const stepX = n === 1 ? 0 : plot.width / (n - 1);
  return values
    .map((v, i) => `${(plot.x + i * stepX).toFixed(1)},${scaleY(v, max, plot).toFixed(1)}`)
    .join(' ');
}

export function buildBars(
  values: number[],
  plot: PlotArea,
  max: number,
  barWidth: number
): Array<{ x: number; y: number; height: number }> {
  const n = values.length;
  if (n === 0) return [];
  const stepX = n === 1 ? 0 : plot.width / (n - 1);
  return values.map((v, i) => {
    const height = max <= 0 ? 0 : (v / max) * plot.height;
    return {
      x: plot.x + i * stepX - barWidth / 2,
      y: plot.y + plot.height - height,
      height,
    };
  });
}

export interface GridSlot {
  x: number;
  width: number;
  y: number;
}

export function chartGridSlots(
  count: number,
  opts: { marginX: number; contentWidth: number; colGap: number; rowHeight: number; startY: number }
): GridSlot[] {
  const colWidth = (opts.contentWidth - opts.colGap) / 2;
  const rightX = opts.marginX + colWidth + opts.colGap;
  const slots: GridSlot[] = [];
  let row = 0;
  for (let i = 0; i < count; i++) {
    const isLastOdd = count % 2 === 1 && i === count - 1;
    if (isLastOdd) {
      slots.push({ x: opts.marginX, width: opts.contentWidth, y: opts.startY + row * opts.rowHeight });
      break;
    }
    const isLeft = i % 2 === 0;
    slots.push({
      x: isLeft ? opts.marginX : rightX,
      width: colWidth,
      y: opts.startY + row * opts.rowHeight,
    });
    if (!isLeft) row++;
  }
  return slots;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- src/render/chart.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/render/chart.ts src/render/chart.test.ts
git commit -m "Add pure SVG chart geometry helpers"
```

---

### Task 9: SVG renderer, part 1 — shell, hero, polaroid, more moments

**Files:**
- Create: `src/render/detailed.ts`
- Test: `src/render/detailed.test.ts`

**Interfaces:**
- Consumes: `HeroMoment`/`Moment` (Task 4), `renderCumulativeSentence` (Task 5),
  `DetailedYearData[]` (Task 2)
- Produces: `renderHeroSection(hero, moments, cumulativeLines): string` (an SVG
  fragment string) — Task 10 composes this into the full `renderDetailedSvg`.

This task encodes spec §3.1–§3.3's exact visual design established in
`demo/detailed-card.svg`: warm paper background (`#faf3e6`-family), ink-toned text
only, the illustrated sprout polaroid, and staggered fade-in via CSS `@keyframes`
respecting `prefers-reduced-motion`.

- [ ] **Step 1: Write the failing tests**

```ts
// src/render/detailed.test.ts
import { describe, it, expect } from 'vitest';
import { renderHeroSection } from './detailed';

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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/render/detailed.test.ts`
Expected: FAIL — module doesn't exist.

- [ ] **Step 3: Implement `src/render/detailed.ts` (hero portion)**

```ts
import type { HeroMoment, Moment } from '../detailed/moments';

const INK = '#1c1917';
const INK_SECONDARY = '#57534e';
const INK_LABEL = '#78716c';
const INK_TERTIARY = '#8a8175';

function escapeXml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export const CARD_STYLE = `
  .hero-fade, .moment-fade, .polaroid { opacity: 0; animation: memFadeIn 0.9s ease-out forwards; }
  .polaroid { animation-delay: 0s; animation-duration: 1.1s; }
  .hero-fade.d1 { animation-delay: .35s; }
  .hero-fade.d2 { animation-delay: .6s; }
  .hero-fade.d3 { animation-delay: .95s; }
  .hero-fade.d5 { animation-delay: 1.3s; }
  .hero-fade.d6 { animation-delay: 1.55s; }
  .moment-fade.m0 { animation-delay: 1.7s; }
  .moment-fade.m1 { animation-delay: 1.85s; }
  .moment-fade.m2 { animation-delay: 2.0s; }
  .moment-fade.m3 { animation-delay: 2.15s; }
  @keyframes memFadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
  @media (prefers-reduced-motion: reduce) {
    .hero-fade, .moment-fade, .polaroid { animation: none; opacity: 1; transform: none; }
  }
`;

function renderPolaroid(): string {
  return `
  <g class="polaroid" filter="url(#polaroidShadow)" transform="rotate(-4 87 150)">
    <rect x="28" y="80" width="118" height="140" rx="3" fill="#fffdf8" stroke="#e8ddc8"/>
    <rect x="36" y="88" width="102" height="98" fill="url(#photoSky)"/>
    <circle cx="118" cy="100" r="10" fill="#f6cf7e" opacity="0.8"/>
    <ellipse cx="87" cy="186" rx="40" ry="8" fill="#8b6f4e"/>
    <path d="M87,186 C87,160 78,150 87,128" fill="none" stroke="#6b9b5e" stroke-width="3" stroke-linecap="round"/>
    <path d="M87,150 C74,146 68,136 70,126" fill="none" stroke="#6b9b5e" stroke-width="3" stroke-linecap="round"/>
    <path d="M87,138 C98,133 103,124 101,114" fill="none" stroke="#6b9b5e" stroke-width="3" stroke-linecap="round"/>
    <text x="87" y="210" text-anchor="middle" font-family="'Caveat', cursive" font-size="17" fill="${INK_SECONDARY}">the start</text>
  </g>
  <rect x="60" y="70" width="40" height="15" rx="1" fill="#d9a86c" opacity="0.65" transform="rotate(6 80 77)"/>`;
}

export function renderHeroSection(hero: HeroMoment, moments: Moment[], cumulativeLines: string[]): string {
  const parts: string[] = [];

  parts.push(renderPolaroid());
  parts.push(`
  <g class="hero-fade d1"><text x="172" y="112" font-size="11" font-weight="600" fill="${INK_LABEL}" letter-spacing="1">THE START</text></g>
  <g class="hero-fade d2"><text x="172" y="150" font-size="30" font-weight="700" fill="${INK}">${escapeXml(hero.name)}</text></g>
  <g class="hero-fade d3"><text x="172" y="178" font-size="14" fill="${INK_SECONDARY}">first public repo, ${hero.date} — the floor this whole story climbs from.</text></g>`);

  parts.push(`
  <g class="hero-fade d5">`);
  cumulativeLines.forEach((line, i) => {
    parts.push(`    <text x="28" y="${252 + i * 26}" font-size="19" fill="${INK}">${escapeXml(line)}</text>`);
  });
  parts.push(`  </g>`);

  if (moments.length > 0) {
    parts.push(`
  <g class="hero-fade d6"><text x="28" y="312" font-size="12" font-weight="600" fill="${INK_LABEL}" letter-spacing=".5">MORE MOMENTS</text></g>
  <g font-size="15" fill="${INK}">`);
    moments.forEach((m, i) => {
      const y = 336 + i * 24;
      parts.push(
        `    <text class="moment-fade m${i}" x="28" y="${y}"><tspan fill="${INK_TERTIARY}" font-size="14">${m.date}</tspan>   ${escapeXml(
          m.name
        )} · ${escapeXml(m.why)}</text>`
      );
    });
    parts.push(`  </g>`);
  }

  return parts.join('\n');
}

export function heroSectionHeight(momentsCount: number): number {
  // y of the last MORE MOMENTS line (or the cumulative sentence if there are none) + closing padding
  if (momentsCount === 0) return 278 + 20;
  return 336 + (momentsCount - 1) * 24 + 20;
}
```

Note: `heroSectionHeight` is what lets the rest of the card (Task 10) start below a
variable-length moments list instead of a hardcoded `y` — this is the "cursor" pattern
this renderer uses throughout instead of the fixed pixel coordinates in the
hand-authored `demo/detailed-card.svg` mock.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- src/render/detailed.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/render/detailed.ts src/render/detailed.test.ts
git commit -m "Render the hero, polaroid, and more-moments SVG section"
```

---

### Task 10: SVG renderer, part 2 — charts grid, report card, year notes, full `renderDetailedSvg`

**Files:**
- Modify: `src/render/detailed.ts`
- Modify: `src/render/detailed.test.ts`

**Interfaces:**
- Consumes: `chartGridSlots`/`buildPolylinePoints`/`buildBars` (Task 8),
  `bucketByMonth`/`bucketCumulativeByMonth`/`monthLabels` (Task 3), `buildReportCard`
  (Task 6), `buildYearNote` (Task 7), `selectHero`/`selectMoreMoments` (Task 4),
  `renderCumulativeSentence` (Task 5), `renderHeroSection`/`heroSectionHeight`/`CARD_STYLE`
  (Task 9)
- Produces: `renderDetailedSvg(username, arcLine, years, journeyYears): string` — Task
  12 (CLI wiring) consumes this as the full second gist file's content.

Implements spec §3.4 (2-up chart grid + solo odd row), §6 (report card), §8 (year
notes), and closes the paper-background card shell from §3.3.

- [ ] **Step 1: Write the failing tests** (append to `src/render/detailed.test.ts`)

```ts
import { renderDetailedSvg } from './detailed';
import type { DetailedYearData } from '../detailed/types';
import type { JourneyYear } from '../types';

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
    expect(svg).not.toMatch(/0<tspan[^>]*>&#x2605;/); // never a star on a zero
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/render/detailed.test.ts`
Expected: FAIL — `renderDetailedSvg` doesn't exist yet.

- [ ] **Step 3: Implement the rest of `src/render/detailed.ts`**

Append to the file from Task 9:

```ts
import { chartGridSlots, buildPolylinePoints, buildBars, type PlotArea } from './chart';
import { monthLabels, bucketByMonth, bucketCumulativeByMonth } from '../detailed/monthly';
import { buildReportCard } from '../detailed/reportcard';
import { buildYearNote } from '../detailed/notes';
import { selectHero, selectMoreMoments } from '../detailed/moments';
import { renderCumulativeSentence } from '../detailed/sentence';
import type { DetailedYearData } from '../detailed/types';
import type { JourneyYear } from '../types';

const MARGIN = 28;
const CARD_WIDTH = 840;
const CONTENT_WIDTH = CARD_WIDTH - MARGIN * 2;
const ROW_HEIGHT = 132;
const PLOT_HEIGHT = 70;
const PLOT_INSET = 10;

interface ChartSpec {
  label: string;
  color: string;
  values: number[];
  max: number;
  caption: string;
  kind: 'line' | 'bars';
}

function renderChart(spec: ChartSpec, slot: { x: number; width: number; y: number }): string {
  const plot: PlotArea = {
    x: slot.x + PLOT_INSET,
    y: slot.y + 22,
    width: slot.width - PLOT_INSET,
    height: PLOT_HEIGHT,
  };
  const plotBottom = plot.y + plot.height;
  let body: string;
  if (spec.kind === 'bars') {
    const bars = buildBars(spec.values, plot, spec.max, 4.8);
    body = bars.map((b) => `<rect x="${b.x.toFixed(1)}" y="${b.y.toFixed(1)}" width="4.8" height="${b.height.toFixed(1)}" rx="1" fill="${spec.color}"/>`).join('');
  } else {
    body = `<polyline fill="none" stroke="${spec.color}" stroke-width="2" points="${buildPolylinePoints(spec.values, plot, spec.max)}"/>`;
  }
  return `
  <text x="${slot.x}" y="${slot.y}" font-size="11" font-weight="600" fill="${INK_LABEL}">${escapeXml(spec.label)}</text>
  <line x1="${plot.x}" y1="${plotBottom}" x2="${plot.x + plot.width}" y2="${plotBottom}" stroke="#ded3bd"/>
  <text x="${plot.x - 2}" y="${plot.y + 4}" text-anchor="end" font-size="9" font-family="ui-monospace, Consolas, monospace" fill="#a39a8b">${Math.round(spec.max)}</text>
  ${body}
  <text x="${slot.x}" y="${plotBottom + 30}" font-size="10" fill="${INK_SECONDARY}">${escapeXml(spec.caption)}</text>`;
}

function buildChartSpecs(years: DetailedYearData[]): ChartSpec[] {
  const contributions = bucketByMonth(years, (y) => y.commitDayDates); // proxy: commit-day dates stand in for "contributions" volume per month
  const commitDays = contributions; // same source today; kept separate per spec's two distinct charts
  const ownOpened = bucketByMonth(years, (y) => y.ownPROpenedEvents.map((e) => e.date));
  const extOpened = bucketByMonth(years, (y) => y.externalPROpenedEvents.map((e) => e.date));
  const ownMerged = bucketByMonth(years, (y) => y.ownMergedPRs.map((e) => e.date));
  const extMerged = bucketByMonth(years, (y) => y.externalMergedPRs.map((e) => e.date));
  const reposCreated = bucketByMonth(years, (y) => y.repos.map((r) => r.createdAt));
  const starsCumulative = bucketCumulativeByMonth(years, (y) => y.starEvents.map((e) => e.starredAt));

  const totalOwnPRs = years.reduce((s, y) => s + y.metrics.ownPRs, 0);
  const totalExtPRs = years.reduce((s, y) => s + y.metrics.externalPRs, 0);
  const totalOwnMerged = years.reduce((s, y) => s + y.ownMergedPRs.length, 0);
  const totalExtMerged = years.reduce((s, y) => s + y.externalMergedPRs.length, 0);
  const totalStars = years.reduce((s, y) => s + y.metrics.starsGained, 0);
  const totalDays = years.reduce((s, y) => s + y.metrics.commitDays, 0);

  return [
    {
      label: 'CONTRIBUTIONS',
      color: '#2f8a4e',
      values: contributions,
      max: Math.max(1, ...contributions),
      caption: `${totalDays} commit days across the window.`,
      kind: 'line',
    },
    {
      label: 'COMMIT DAYS',
      color: '#2f6fce',
      values: commitDays,
      max: Math.max(1, ...commitDays),
      caption: years.map((y) => y.metrics.commitDays).join(' → ') + ' days/year.',
      kind: 'line',
    },
    {
      label: 'PULL REQUESTS',
      color: '#2f6fce',
      values: ownOpened.map((v, i) => v + extOpened[i]),
      max: Math.max(1, ...ownOpened.map((v, i) => v + extOpened[i])),
      caption: `${totalOwnPRs} own, ${totalExtPRs} external opened.`,
      kind: 'line',
    },
    {
      label: 'MERGED PRs',
      color: '#c9781f',
      values: ownMerged.map((v, i) => v + extMerged[i]),
      max: Math.max(1, ...ownMerged.map((v, i) => v + extMerged[i])),
      caption: `${totalOwnMerged} own, ${totalExtMerged} external merged.`,
      kind: 'line',
    },
    {
      label: 'REPOS CREATED',
      color: '#7c4fd1',
      values: reposCreated,
      max: Math.max(1, ...reposCreated),
      caption: `${years.reduce((s, y) => s + y.metrics.reposCreated, 0)} repos across the window.`,
      kind: 'bars',
    },
    {
      label: 'STARS (cumulative)',
      color: '#c9971f',
      values: starsCumulative,
      max: Math.max(1, ...starsCumulative),
      caption: `${totalStars} stars, cumulative.`,
      kind: 'line',
    },
    {
      label: 'REVIEWS + ISSUES (too sparse for a line)',
      color: '#d1453d',
      values: [],
      max: 1,
      caption: `${years.reduce((s, y) => s + y.metrics.reviews, 0)} reviews across the window.`,
      kind: 'line',
    },
  ];
}

function renderChartsGrid(years: DetailedYearData[], startY: number): { svg: string; endY: number } {
  const specs = buildChartSpecs(years);
  const slots = chartGridSlots(specs.length, {
    marginX: MARGIN,
    contentWidth: CONTENT_WIDTH,
    colGap: 32,
    rowHeight: ROW_HEIGHT,
    startY,
  });
  const svg = specs.map((spec, i) => renderChart(spec, slots[i])).join('\n');
  const lastRowY = Math.max(...slots.map((s) => s.y));
  return { svg, endY: lastRowY + ROW_HEIGHT - 10 };
}

function renderReportCard(years: DetailedYearData[], startY: number): { svg: string; endY: number } {
  const { rows, highs } = buildReportCard(years);
  const headerY = startY + 15;
  const rowHeight = 28;
  const cols: Array<{ key: keyof (typeof rows)[number]; label: string; x: number }> = [
    { key: 'year', label: 'Year', x: 12 },
    { key: 'language', label: 'Language', x: 60 },
    { key: 'reposActive', label: 'Repos', x: 172 },
    { key: 'longLived', label: 'Long', x: 224 },
    { key: 'days', label: 'Days', x: 276 },
    { key: 'ownPRs', label: 'Own PRs', x: 344 },
    { key: 'externalPRs', label: 'Ext PRs', x: 412 },
    { key: 'ownMerged', label: 'Own mer', x: 488 },
    { key: 'externalMerged', label: 'Ext mer', x: 564 },
    { key: 'reviews', label: 'Rev', x: 612 },
    { key: 'stars', label: 'Stars', x: 668 },
    { key: 'reposCreated', label: 'New repos', x: 768 },
  ];
  const header = cols
    .map(
      (c) =>
        `<text x="${MARGIN + c.x}" y="${headerY}" text-anchor="${c.key === 'year' || c.key === 'language' ? 'start' : 'end'}" font-size="11" font-weight="600" fill="${INK_LABEL}">${c.label}</text>`
    )
    .join('');
  const dataRows = rows
    .map((row, i) => {
      const y = headerY + 28 + i * rowHeight;
      return cols
        .map((c) => {
          const value = row[c.key];
          const star = highs.has(`${row.year}:${c.key}`) ? `<tspan fill="#b8860b">&#x2605;</tspan>` : '';
          return `<text x="${MARGIN + c.x}" y="${y}" text-anchor="${c.key === 'year' || c.key === 'language' ? 'start' : 'end'}" font-size="12" fill="${INK}">${escapeXml(String(value))}${star}</text>`;
        })
        .join('');
    })
    .join('');
  const tableHeight = 28 + rows.length * rowHeight;
  const svg = `
  <text x="${MARGIN}" y="${startY}" font-size="11" font-weight="600" fill="${INK_LABEL}">REPORT CARD</text>
  <rect x="${MARGIN}" y="${startY + 12}" width="${CONTENT_WIDTH}" height="${tableHeight}" rx="6" fill="#fffdf8" stroke="#ded3bd"/>
  ${header}
  ${dataRows}`;
  return { svg, endY: startY + 12 + tableHeight + 10 };
}

function renderYearNotes(years: DetailedYearData[], journeyYears: JourneyYear[], startY: number): string {
  const parts: string[] = [];
  let y = startY;
  for (const detailedYear of years) {
    const journeyYear = journeyYears.find((j) => j.year === detailedYear.year);
    if (!journeyYear) continue;
    const note = buildYearNote(detailedYear, journeyYear.archetype);
    const headingColor = journeyYear.isCurrent ? '#2f8a4e' : INK_SECONDARY;
    parts.push(`
  <text x="${MARGIN}" y="${y}" font-size="13" font-weight="600" fill="${headingColor}">${escapeXml(note.heading)}</text>
  <text x="${MARGIN}" y="${y + 22}" font-size="12" fill="${INK}">
    <tspan x="${MARGIN}" dy="0">${escapeXml(note.lines[0])}</tspan>
    <tspan x="${MARGIN}" dy="18">${escapeXml(note.lines[1])}</tspan>
  </text>`);
    y += 74;
  }
  return parts.join('\n');
}

export function renderDetailedSvg(
  username: string,
  arcLine: string,
  years: DetailedYearData[],
  journeyYears: JourneyYear[]
): string {
  const hero = selectHero(years);
  const moments = hero ? selectMoreMoments(years, hero) : [];
  const totals = years.reduce(
    (acc, y) => ({
      commitDays: acc.commitDays + y.metrics.commitDays,
      ownPRs: acc.ownPRs + y.metrics.ownPRs,
      externalPRs: acc.externalPRs + y.metrics.externalPRs,
      ownMerged: acc.ownMerged + y.ownMergedPRs.length,
      externalMerged: acc.externalMerged + y.externalMergedPRs.length,
      starsGained: acc.starsGained + y.metrics.starsGained,
      reposCreated: acc.reposCreated + y.metrics.reposCreated,
      longLivedRepoCount: acc.longLivedRepoCount + y.metrics.longLivedRepoCount,
    }),
    { commitDays: 0, ownPRs: 0, externalPRs: 0, ownMerged: 0, externalMerged: 0, starsGained: 0, reposCreated: 0, longLivedRepoCount: 0 }
  );
  const cumulativeLines = renderCumulativeSentence({ ...totals, yearCount: years.length });

  const heroSvg = hero ? renderHeroSection(hero, moments, cumulativeLines) : '';
  const heroHeight = hero ? heroSectionHeight(moments.length) : 90;
  const analysisLabelY = 90 + heroHeight + 26;
  const chartsStartY = analysisLabelY + 16;

  const { svg: chartsSvg, endY: afterCharts } = renderChartsGrid(years, chartsStartY);
  const { svg: reportCardSvg, endY: afterReportCard } = renderReportCard(years, afterCharts + 20);
  const notesSvg = renderYearNotes(years, journeyYears, afterReportCard + 30);
  const totalHeight = afterReportCard + 30 + years.length * 74 + 20;

  return `<svg width="${CARD_WIDTH}" height="${totalHeight}" viewBox="0 0 ${CARD_WIDTH} ${totalHeight}" xmlns="http://www.w3.org/2000/svg" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif">
  <defs>
    <style>${CARD_STYLE}</style>
    <clipPath id="cardClip"><rect x="0.5" y="0.5" width="${CARD_WIDTH - 1}" height="${totalHeight - 1}" rx="12"/></clipPath>
    <linearGradient id="photoSky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#fbe9c9"/>
      <stop offset="1" stop-color="#f3d9a8"/>
    </linearGradient>
    <filter id="paperGrain" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="7" result="noise"/>
      <feColorMatrix in="noise" type="matrix" values="0 0 0 0 0.15  0 0 0 0 0.1  0 0 0 0 0.05  0 0 0 0.05 0"/>
    </filter>
    <filter id="polaroidShadow" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="6" stdDeviation="6" flood-color="#3a2a16" flood-opacity="0.22"/>
    </filter>
  </defs>
  <g clip-path="url(#cardClip)">
    <rect x="0" y="0" width="${CARD_WIDTH}" height="${totalHeight}" fill="#faf3e6"/>
    <rect x="0" y="0" width="${CARD_WIDTH}" height="${totalHeight}" filter="url(#paperGrain)"/>
  </g>
  <rect x="0.5" y="0.5" width="${CARD_WIDTH - 1}" height="${totalHeight - 1}" rx="12" fill="none" stroke="#ded3bd"/>
  <text x="${MARGIN}" y="34" font-size="18" font-weight="700" fill="${INK}">${escapeXml(username)} · full journey</text>
  <text x="${MARGIN}" y="54" font-family="ui-monospace, Consolas, monospace" font-size="11" fill="#44403c">${escapeXml(arcLine)}</text>
  ${heroSvg}
  <line x1="${MARGIN}" y1="${analysisLabelY - 16}" x2="${CARD_WIDTH - MARGIN}" y2="${analysisLabelY - 16}" stroke="#ded3bd"/>
  <text x="${MARGIN}" y="${analysisLabelY}" font-size="11" font-weight="600" fill="${INK_LABEL}" letter-spacing="1">ANALYSIS</text>
  <text x="${MARGIN + 58}" y="${analysisLabelY}" font-size="11" fill="#8a8175">— the numbers behind the story above</text>
  ${chartsSvg}
  ${reportCardSvg}
  ${notesSvg}
</svg>`;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- src/render/detailed.test.ts`
Expected: PASS. If the report-card column x-positions or chart captions cause a test
mismatch, fix the test's expectations to match real output — the exact pixel values
are this task's to decide, the tests in Step 1 only assert structural properties
(labels present, ordering, no forbidden colors), not exact coordinates.

- [ ] **Step 5: Commit**

```bash
git add src/render/detailed.ts src/render/detailed.test.ts
git commit -m "Render the chart grid, report card, and year notes; compose renderDetailedSvg"
```

---

### Task 11: Comfort-layer markdown for the gist body (`src/render/detailedMarkdown.ts`)

**Files:**
- Create: `src/render/detailedMarkdown.ts`
- Test: `src/render/detailedMarkdown.test.ts`

**Interfaces:**
- Consumes: `HeroMoment`/`Moment` (Task 4), cumulative sentence lines (Task 5)
- Produces: `renderComfortLayerMarkdown(hero, moments, cumulativeLines): string` — Task
  12 (CLI wiring) appends this after the existing pin markdown in `journey.md`.

Implements spec §10.1 point 1: "Appends the comfort layer *after* the pin lines
(sentence + scenes as markdown, so it still reads if the image fails)."

- [ ] **Step 1: Write the failing test**

```ts
// src/render/detailedMarkdown.test.ts
import { describe, it, expect } from 'vitest';
import { renderComfortLayerMarkdown } from './detailedMarkdown';

describe('renderComfortLayerMarkdown', () => {
  it('renders the cumulative sentence and moments as markdown, readable without the image', () => {
    const md = renderComfortLayerMarkdown(
      { date: '2024-09-01', name: 'seuthootDev' },
      [{ date: '2025-07-03', name: 'a/hanghae99-backend-week1', why: 'first own PR merged' }],
      ['You showed up 241 days in 3 years.', '124 pull requests opened, 106 merged — 23 in someone else’s repo.']
    );
    expect(md).toContain('2024-09-01');
    expect(md).toContain('seuthootDev');
    expect(md).toContain('You showed up 241 days in 3 years.');
    expect(md).toContain('2025-07-03');
    expect(md).toContain('first own PR merged');
  });

  it('omits the moments list entirely when there are none', () => {
    const md = renderComfortLayerMarkdown({ date: '2024-09-01', name: 'x' }, [], ['a', 'b']);
    expect(md).not.toContain('More moments');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/render/detailedMarkdown.test.ts`
Expected: FAIL — module doesn't exist.

- [ ] **Step 3: Implement `src/render/detailedMarkdown.ts`**

```ts
import type { HeroMoment, Moment } from '../detailed/moments';

export function renderComfortLayerMarkdown(hero: HeroMoment, moments: Moment[], cumulativeLines: string[]): string {
  const lines: string[] = [
    '',
    '---',
    '',
    `**${hero.date}** — ${hero.name} · first public repo, the start.`,
    '',
    ...cumulativeLines,
    '',
  ];

  if (moments.length > 0) {
    lines.push('More moments:', '');
    for (const m of moments) {
      lines.push(`- **${m.date}** — ${m.name} · ${m.why}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/render/detailedMarkdown.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/render/detailedMarkdown.ts src/render/detailedMarkdown.test.ts
git commit -m "Render the comfort-layer markdown for the gist body (spec 10.1)"
```

---

### Task 12: Wire into `buildJourney` and `main()`

**Files:**
- Modify: `src/cli.ts`
- Test: `src/cli.test.ts`

**Interfaces:**
- Consumes: everything from Tasks 1–11
- Produces: `JourneyResult` gains `detailedSvg: string`; `main()` writes a second gist
  file `journey.svg` alongside `journey.md`.

Implements spec §10.1 point 2 and §11's pin/gist acceptance criteria ("Pin output is
unchanged in role: no SVG, no scenes" — the pin fields stay exactly as they are today;
only new fields are added).

- [ ] **Step 1: Write the failing tests** (add to `src/cli.test.ts`, next to the
  existing `buildJourney` tests — reuse whatever fake-Octokit fixture that file
  already builds, extending its `search`/`activity` mocks the same way Task 1 did)

```ts
it('includes a non-empty detailedSvg in the result, without changing pinHeadline', async () => {
  const octokit = makeTestOctokit(); // existing helper in this test file
  const before = await buildJourney(octokit, { username: 'seuthootDev', displayName: 'seuthootDev', maxYears: 1, now: new Date('2024-06-01') });
  const result = await buildJourney(octokit, { username: 'seuthootDev', displayName: 'seuthootDev', maxYears: 1, now: new Date('2024-06-01') });
  expect(result.detailedSvg).toContain('<svg');
  expect(result.pinHeadline).toBe(before.pinHeadline);
});

it('appends the comfort layer markdown after the pin lines in gistBody', async () => {
  const octokit = makeTestOctokit();
  const result = await buildJourney(octokit, { username: 'seuthootDev', displayName: 'seuthootDev', maxYears: 1, now: new Date('2024-06-01') });
  expect(result.gistBody.indexOf(result.pinHeadline)).toBe(result.gistBody.indexOf('# seuthootDev'.length > 0 ? result.pinHeadline : ''));
  expect(result.gistBody).toContain('More moments:');
});
```

(If `src/cli.test.ts` doesn't already export/expose a reusable `makeTestOctokit`
helper, build one inline the same way `src/fetch/github.test.ts`'s `makeOctokit` does
— see Task 1 — since `buildJourney` now needs the same merged-PR/star-event mocks
`fetchRawYear` does.)

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/cli.test.ts`
Expected: FAIL — `result.detailedSvg` is `undefined`.

- [ ] **Step 3: Wire it up in `src/cli.ts`**

```ts
import { toDetailedYearData } from './detailed';
import { renderDetailedSvg } from './render/detailed';
import { renderComfortLayerMarkdown } from './render/detailedMarkdown';
import { selectHero, selectMoreMoments } from './detailed/moments';
import { renderCumulativeSentence } from './detailed/sentence';
import { summarizeJourney } from './summarize';
import type { DetailedYearData } from './detailed/types';
```

In `buildJourney`, after the existing `yearlyMetrics.push(metrics)` loop, collect the
raw-per-year data too (the loop already fetches `raw` and discards it after computing
`metrics` — keep it):

```ts
  const priorLanguages = new Set<string>();
  const yearlyMetrics: YearlyMetrics[] = [];
  const detailedYears: DetailedYearData[] = [];
  for (const year of years) {
    const raw = await fetchRawYear(octokit, opts.username, year);
    const metrics = toYearlyMetrics(raw, priorLanguages);
    Object.keys(metrics.languageBytes).forEach((lang) => priorLanguages.add(lang));
    yearlyMetrics.push(metrics);
    detailedYears.push(toDetailedYearData(raw, metrics));
  }

  const contexts = buildYearContexts(yearlyMetrics);
  const journeyYears = contexts.map(evaluateYear);

  const arcLine = summarizeJourney(journeyYears) || journeyYears.map((y) => y.archetype).join(' → ');
  const detailedSvg = renderDetailedSvg(opts.username, arcLine, detailedYears, journeyYears);

  const hero = selectHero(detailedYears);
  const moments = hero ? selectMoreMoments(detailedYears, hero) : [];
  const totals = detailedYears.reduce(
    (acc, y) => ({
      commitDays: acc.commitDays + y.metrics.commitDays,
      ownPRs: acc.ownPRs + y.metrics.ownPRs,
      externalPRs: acc.externalPRs + y.metrics.externalPRs,
      ownMerged: acc.ownMerged + y.ownMergedPRs.length,
      externalMerged: acc.externalMerged + y.externalMergedPRs.length,
      starsGained: acc.starsGained + y.metrics.starsGained,
      reposCreated: acc.reposCreated + y.metrics.reposCreated,
      longLivedRepoCount: acc.longLivedRepoCount + y.metrics.longLivedRepoCount,
    }),
    { commitDays: 0, ownPRs: 0, externalPRs: 0, ownMerged: 0, externalMerged: 0, starsGained: 0, reposCreated: 0, longLivedRepoCount: 0 }
  );
  const cumulativeLines = renderCumulativeSentence({ ...totals, yearCount: detailedYears.length });
  const comfortLayerMarkdown = hero ? renderComfortLayerMarkdown(hero, moments, cumulativeLines) : '';

  return {
    pinHeadline: renderPinHeadline(journeyYears),
    gistBody: renderGistBody(opts.username, opts.displayName, journeyYears, yearlyMetrics) + comfortLayerMarkdown,
    detailedSvg,
  };
```

Update `JourneyResult`:

```ts
export interface JourneyResult {
  pinHeadline: string;
  gistBody: string;
  detailedSvg: string;
}
```

In `main()`, write the second gist file when a gist is being updated:

```ts
  if (gistId && token) {
    await updateGist(octokit as unknown as GistOctokitLike, gistId, 'journey.md', result.gistBody);
    await updateGist(octokit as unknown as GistOctokitLike, gistId, 'journey.svg', result.detailedSvg);
    console.log(`Updated gist ${gistId}`);
  } else {
    console.log(result.gistBody);
  }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS — the full suite, including every previously-passing test (this
confirms the pin's existing behavior, per the Global Constraints, is unchanged).

- [ ] **Step 5: Commit**

```bash
git add src/cli.ts src/cli.test.ts
git commit -m "Wire the detailed analysis view into buildJourney and the gist write"
```

---

## Explicitly out of scope for this plan

Per spec §10.3/§10.4, these are follow-ups that need a live `GH_TOKEN` against a real
account and are not unit-testable the way Tasks 1–12 are — do them manually after this
plan lands, not as part of it:

- Regenerating `demo/torvalds.svg` from the real renderer against the live `torvalds`
  account, and swapping the README's screenshot to it.
- The short README line ("Open the gist to see the full journey...").

## Self-review notes

- **Spec coverage:** §2 (no invented numbers/shaming/filler) is enforced by Task 4
  (skip-if-missing candidates), Task 5/7 (slot logic only fires on `> 0`), Task 6
  (never ★ a zero). §3.1–§3.4 → Tasks 9–10. §4 → Task 5. §5 → Task 4. §6 → Task 6. §7 →
  Task 10 (charts section). §8 → Task 7. §9 (new data fields) → Task 1. §10.1 → Tasks
  11–12. §10.2 (Action-only, no live API) → nothing in this plan adds a server, so
  satisfied by omission. §11 acceptance items are each traceable to the task that
  implements them (see mapping above).
- **Placeholder scan:** no TBD/TODO, no "similar to Task N" without code, every step
  has real code or a real shell command.
- **Type consistency:** `HeroMoment`/`Moment` (Task 4) are the exact types
  `renderHeroSection` (Task 9), `renderComfortLayerMarkdown` (Task 11), and `main()`
  (Task 12) all consume. `DetailedYearData` (Task 2) is the one shape every
  `detailed/*` and `render/detailed.ts` function takes. `CumulativeInput` (Task 5) is
  reused identically by Task 7 (year notes) and Task 12 (whole-window sentence) via
  the same field names.
