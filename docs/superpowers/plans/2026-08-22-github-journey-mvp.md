# GitHub Journey MVP v0.1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Node.js/TypeScript CLI that analyzes a GitHub user's last-5-years activity (languages, repos, commits, PRs) and produces a 5-line "Journey" pin headline plus a fuller Gist body, and a GitHub Action that keeps a pinned Gist updated with it.

**Architecture:** A linear pipeline of small pure modules — fetch (GitHub REST/GraphQL → raw per-year data), metrics (raw → `YearlyMetrics`), diff (build per-year `YearContext` with baseline/streak info), rules (10-archetype Rule Engine → `JourneyYear`), render (→ pin text + Gist body) — wired together by a thin CLI, wrapped by a GitHub Action.

**Tech Stack:** TypeScript, Node.js, `vitest` (tests), `tsx` (run TS directly, no build step), `@octokit/rest` + `@octokit/graphql` (GitHub API), GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-08-22-github-journey-mvp-pin-design.md`

## Global Constraints

- Only 4 data axes: Languages, Repositories, Commits, Pull Requests (no Issues, no Framework/Library detection) — per spec §2.
- Pin headline is always exactly 5 lines (or fewer if the account is younger than 5 years) — per spec §3.
- 10 archetypes, precedence order: `Quiet Year > Rising Star > Collaborator > Open Source Contributor > Builder > Creator > Explorer > Polyglot > Specialist > Consistent` — per spec §3.
- No image/logo icons anywhere in pin output — Unicode text/emoji only — per spec §3.
- No year is ever omitted from the output; `Consistent` is an unconditional fallback — per spec §7.
- Reason text conventions (locked during planning, extending spec §3's sketch): per-year "gain" counts (`newLanguageCount`, `reposCreated`, `externalPRs`, `reviews`, `starsGained`) render with a leading `+`; current-state counts (`longLivedRepoCount`, distinct active language count, streak days) render with no sign.
- Data-model extension beyond spec §6's sketch: `YearlyMetrics` gains `externalReposContributed: number` (needed for the Open Source Contributor rule, which spec's own table requires but the sketch omitted).
- Collaborator's trigger drops the "issues" term from README §12's original wording (issues are out of scope per the 4-axis constraint above) — it fires on `reviews` growth vs. baseline alone (not combined with external PRs — combining them let external-PR-heavy years falsely read as Collaborator, since a zero review baseline made any external-PR total look like "growth").

---

## File Structure

```
package.json
tsconfig.json
vitest.config.ts
src/
  types.ts                  # YearlyMetrics, Reason, Archetype, JourneyYear
  metrics/
    language.ts              # dominantLanguage, dominantLanguageShare, distinctLanguageCount, languageEmoji
    language.test.ts
    index.ts                  # toYearlyMetrics(raw, priorLanguages)
    index.test.ts
  diff/
    index.ts                   # YearlyBaseline, YearContext, buildYearContexts
    index.test.ts
  rules/
    index.ts                    # evaluateYear, RULES (10 rules + thresholds)
    index.test.ts
  render/
    index.ts                     # renderPinHeadline, renderGistBody
    index.test.ts
  fetch/
    types.ts                      # RawYearData
    github.ts                      # fetchAccountCreatedYear, fetchRawYear
    github.test.ts
  gist.ts                         # updateGist
  gist.test.ts
  cli.ts                          # buildJourney, main
  cli.test.ts
test/
  workflow.test.ts                # validates .github/workflows/update-journey-gist.yml
.github/
  workflows/
    update-journey-gist.yml
```

`demo/journey-demo.svg` and `demo/README.md` (an earlier spike built on the wrong "pinned repo
README + SVG" assumption) are deleted in Task 1.

---

### Task 1: Project scaffolding, shared types, language helpers, spike cleanup

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vitest.config.ts`
- Create: `src/types.ts`
- Create: `src/metrics/language.ts`
- Test: `src/metrics/language.test.ts`
- Delete: `demo/journey-demo.svg`
- Delete: `demo/README.md`

**Interfaces:**
- Produces (used by every later task):
  ```ts
  // src/types.ts
  export interface YearlyMetrics {
    year: number;
    languageBytes: Record<string, number>;
    newLanguageCount: number;
    reposCreated: number;
    reposActive: number;
    longLivedRepoCount: number;
    activeMonths: number;
    commitDays: number;
    longestStreakDays: number;
    ownPRs: number;
    externalPRs: number;
    externalReposContributed: number;
    reviews: number;
    starsGained: number;
  }

  export type Reason =
    | { kind: 'language'; emoji: string; label: string }
    | { kind: 'metric'; icon: string; text: string };

  export type Archetype =
    | 'Quiet Year' | 'Rising Star' | 'Collaborator' | 'Open Source Contributor' | 'Builder'
    | 'Creator' | 'Explorer' | 'Polyglot' | 'Specialist' | 'Consistent';

  export interface JourneyYear {
    year: number;
    archetype: Archetype;
    reason: Reason;
    isCurrent: boolean;
  }
  ```
  ```ts
  // src/metrics/language.ts
  export function dominantLanguage(metrics: Pick<YearlyMetrics, 'languageBytes'>): string | null;
  export function dominantLanguageShare(metrics: Pick<YearlyMetrics, 'languageBytes'>): number;
  export function distinctLanguageCount(metrics: Pick<YearlyMetrics, 'languageBytes'>): number;
  export function languageEmoji(language: string): string;
  ```

- [ ] **Step 1: Initialize the package and TypeScript config**

`package.json`:
```json
{
  "name": "github-journey",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "vitest run",
    "cli": "tsx src/cli.ts"
  },
  "bin": {
    "github-journey": "src/cli.ts"
  },
  "dependencies": {
    "@octokit/rest": "^21.0.0",
    "@octokit/graphql": "^8.1.1"
  },
  "devDependencies": {
    "typescript": "^5.5.0",
    "tsx": "^4.16.0",
    "vitest": "^2.0.0",
    "js-yaml": "^4.1.0",
    "@types/js-yaml": "^4.0.9",
    "@types/node": "^20.14.0"
  }
}
```

`tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "types": ["node"]
  },
  "include": ["src", "test"]
}
```

`vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts', 'test/**/*.test.ts'],
  },
});
```

Run: `npm install`
Expected: installs cleanly, creates `package-lock.json`.

- [ ] **Step 2: Remove the wrong-assumption spike**

Run: `git rm demo/journey-demo.svg demo/README.md`
Expected: both files staged for deletion. If the `demo/` directory becomes empty, that's fine — no placeholder file needed.

- [ ] **Step 3: Write `src/types.ts`**

Use the exact interface block from the Interfaces section above.

- [ ] **Step 4: Write the failing test for language helpers**

`src/metrics/language.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { dominantLanguage, dominantLanguageShare, distinctLanguageCount, languageEmoji } from './language';

describe('dominantLanguage', () => {
  it('returns the language with the most bytes', () => {
    expect(dominantLanguage({ languageBytes: { Python: 500, JavaScript: 200 } })).toBe('Python');
  });

  it('breaks ties alphabetically for determinism', () => {
    expect(dominantLanguage({ languageBytes: { TypeScript: 100, JavaScript: 100 } })).toBe('JavaScript');
  });

  it('returns null when there are no languages', () => {
    expect(dominantLanguage({ languageBytes: {} })).toBeNull();
  });
});

describe('dominantLanguageShare', () => {
  it('returns the fraction of bytes held by the dominant language', () => {
    expect(dominantLanguageShare({ languageBytes: { Python: 750, JavaScript: 250 } })).toBeCloseTo(0.75);
  });

  it('returns 0 when there are no languages', () => {
    expect(dominantLanguageShare({ languageBytes: {} })).toBe(0);
  });
});

describe('distinctLanguageCount', () => {
  it('counts distinct languages', () => {
    expect(distinctLanguageCount({ languageBytes: { Python: 1, Go: 1, Rust: 1 } })).toBe(3);
  });
});

describe('languageEmoji', () => {
  it('maps known languages to their mascot emoji', () => {
    expect(languageEmoji('Python')).toBe('🐍');
    expect(languageEmoji('TypeScript')).toBe('🔷');
  });

  it('falls back to a generic icon for unknown languages', () => {
    expect(languageEmoji('COBOL')).toBe('💻');
  });
});
```

- [ ] **Step 5: Run tests to verify they fail**

Run: `npx vitest run src/metrics/language.test.ts`
Expected: FAIL — `./language` module not found.

- [ ] **Step 6: Implement `src/metrics/language.ts`**

```ts
import type { YearlyMetrics } from '../types';

const LANGUAGE_EMOJI: Record<string, string> = {
  Python: '🐍',
  Java: '☕',
  JavaScript: '💛',
  TypeScript: '🔷',
  Go: '🐹',
  Rust: '🦀',
  'C++': '➕',
  C: '➕',
  'C#': '🎯',
  Kotlin: '🟣',
  Swift: '🐦',
};

const DEFAULT_LANGUAGE_EMOJI = '💻';

type LanguageBag = Pick<YearlyMetrics, 'languageBytes'>;

export function dominantLanguage(metrics: LanguageBag): string | null {
  const entries = Object.entries(metrics.languageBytes);
  if (entries.length === 0) return null;
  entries.sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  return entries[0][0];
}

export function dominantLanguageShare(metrics: LanguageBag): number {
  const entries = Object.entries(metrics.languageBytes);
  const total = entries.reduce((sum, [, bytes]) => sum + bytes, 0);
  if (total === 0) return 0;
  const top = Math.max(...entries.map(([, bytes]) => bytes));
  return top / total;
}

export function distinctLanguageCount(metrics: LanguageBag): number {
  return Object.keys(metrics.languageBytes).length;
}

export function languageEmoji(language: string): string {
  return LANGUAGE_EMOJI[language] ?? DEFAULT_LANGUAGE_EMOJI;
}
```

- [ ] **Step 7: Run tests to verify they pass**

Run: `npx vitest run src/metrics/language.test.ts`
Expected: PASS (8 tests).

- [ ] **Step 8: Commit**

```bash
git add package.json tsconfig.json vitest.config.ts src/types.ts src/metrics/language.ts src/metrics/language.test.ts
git add -u demo
git commit -m "Scaffold project, add shared types and language helpers"
```

---

### Task 2: Diff/baseline module

**Files:**
- Create: `src/diff/index.ts`
- Test: `src/diff/index.test.ts`

**Interfaces:**
- Consumes: `YearlyMetrics` (Task 1), `dominantLanguage`, `distinctLanguageCount` (Task 1)
- Produces:
  ```ts
  export interface YearlyBaseline {
    avgReviews: number;
    avgExternalPRs: number;
    avgStarsGained: number;
    avgReposCreated: number;
    avgReposActive: number;
    avgCommitDays: number;
    avgLanguageBreadth: number;
  }

  export interface YearContext {
    metrics: YearlyMetrics;
    baseline: YearlyBaseline | null;
    sameLanguageStreakYears: number;
    isCurrent: boolean;
  }

  export function buildYearContexts(sortedByYearAsc: YearlyMetrics[]): YearContext[];
  ```

- [ ] **Step 1: Write the failing tests**

`src/diff/index.test.ts`:
```ts
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/diff/index.test.ts`
Expected: FAIL — `./index` module not found.

- [ ] **Step 3: Implement `src/diff/index.ts`**

```ts
import type { YearlyMetrics } from '../types';
import { dominantLanguage, distinctLanguageCount } from '../metrics/language';

export interface YearlyBaseline {
  avgReviews: number;
  avgExternalPRs: number;
  avgStarsGained: number;
  avgReposCreated: number;
  avgReposActive: number;
  avgCommitDays: number;
  avgLanguageBreadth: number;
}

export interface YearContext {
  metrics: YearlyMetrics;
  baseline: YearlyBaseline | null;
  sameLanguageStreakYears: number;
  isCurrent: boolean;
}

function average(values: number[]): number {
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function computeBaseline(all: YearlyMetrics[], excludeIndex: number): YearlyBaseline | null {
  const others = all.filter((_, i) => i !== excludeIndex);
  if (others.length === 0) return null;
  return {
    avgReviews: average(others.map((m) => m.reviews)),
    avgExternalPRs: average(others.map((m) => m.externalPRs)),
    avgStarsGained: average(others.map((m) => m.starsGained)),
    avgReposCreated: average(others.map((m) => m.reposCreated)),
    avgReposActive: average(others.map((m) => m.reposActive)),
    avgCommitDays: average(others.map((m) => m.commitDays)),
    avgLanguageBreadth: average(others.map((m) => distinctLanguageCount(m))),
  };
}

function computeStreak(sorted: YearlyMetrics[], index: number): number {
  const lang = dominantLanguage(sorted[index]);
  if (lang === null) return 0;
  let streak = 1;
  for (let i = index - 1; i >= 0; i--) {
    if (dominantLanguage(sorted[i]) === lang) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

export function buildYearContexts(sortedByYearAsc: YearlyMetrics[]): YearContext[] {
  return sortedByYearAsc.map((metrics, index) => ({
    metrics,
    baseline: computeBaseline(sortedByYearAsc, index),
    sameLanguageStreakYears: computeStreak(sortedByYearAsc, index),
    isCurrent: index === sortedByYearAsc.length - 1,
  }));
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/diff/index.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/diff/index.ts src/diff/index.test.ts
git commit -m "Add year-context builder with baseline and language-streak tracking"
```

---

### Task 3: Rule Engine (10 archetypes)

**Files:**
- Create: `src/rules/index.ts`
- Test: `src/rules/index.test.ts`

**Interfaces:**
- Consumes: `YearContext`, `YearlyBaseline` (Task 2); `Archetype`, `Reason`, `JourneyYear` (Task 1); `dominantLanguage`, `dominantLanguageShare`, `distinctLanguageCount`, `languageEmoji` (Task 1)
- Produces:
  ```ts
  export function evaluateYear(ctx: YearContext): JourneyYear;
  ```

- [ ] **Step 1: Write the failing tests**

`src/rules/index.test.ts`:
```ts
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

  it('carries the year through from the metrics', () => {
    const result = evaluateYear(ctx({ metrics: metrics({ year: 2019, commitDays: 40 }) }));
    expect(result.year).toBe(2019);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/rules/index.test.ts`
Expected: FAIL — `./index` module not found.

- [ ] **Step 3: Implement `src/rules/index.ts`**

```ts
import type { YearContext } from '../diff';
import type { Archetype, JourneyYear, Reason } from '../types';
import { dominantLanguage, dominantLanguageShare, distinctLanguageCount, languageEmoji } from '../metrics/language';

const EXPLORER_MIN_NEW_LANGS = 3;
const EXPLORER_MIN_BREADTH = 4;
const SPECIALIST_MIN_STREAK_YEARS = 2;
const SPECIALIST_MAX_BREADTH = 2;
const SPECIALIST_MIN_DEPTH_SHARE = 0.6;
const BUILDER_MIN_ACTIVE_REPOS = 3;
const BUILDER_MIN_LONG_LIVED = 2;
const CREATOR_MIN_REPOS_CREATED = 4;
const OSS_MIN_EXTERNAL_PRS = 5;
const OSS_MIN_EXTERNAL_REPOS = 2;
const COLLAB_GROWTH_MULTIPLIER = 1.5;
const COLLAB_MIN_ABSOLUTE = 5;
const RISING_STAR_GROWTH_MULTIPLIER = 2.0;
const RISING_STAR_MIN_ABSOLUTE = 10;
const QUIET_YEAR_RATIO = 0.3;
const POLYGLOT_MIN_BREADTH = 4;

interface RuleMatch {
  archetype: Archetype;
  reason: Reason;
}

type Rule = (ctx: YearContext) => RuleMatch | null;

function metricReason(icon: string, text: string): Reason {
  return { kind: 'metric', icon, text };
}

const quietYear: Rule = (ctx) => {
  const b = ctx.baseline;
  if (!b) return null;
  const m = ctx.metrics;
  const wellBelow = (value: number, avg: number) => avg > 0 && value <= avg * QUIET_YEAR_RATIO;
  const allQuiet =
    wellBelow(m.commitDays, b.avgCommitDays) &&
    wellBelow(m.reposCreated + m.reposActive, b.avgReposCreated + b.avgReposActive) &&
    wellBelow(m.ownPRs + m.externalPRs, b.avgExternalPRs + 1) &&
    wellBelow(m.reviews, b.avgReviews + 1);
  if (!allQuiet) return null;
  return { archetype: 'Quiet Year', reason: metricReason('💤', 'low activity') };
};

const risingStar: Rule = (ctx) => {
  const b = ctx.baseline;
  if (!b) return null;
  const gained = ctx.metrics.starsGained;
  if (gained < RISING_STAR_MIN_ABSOLUTE) return null;
  if (gained < b.avgStarsGained * RISING_STAR_GROWTH_MULTIPLIER) return null;
  return { archetype: 'Rising Star', reason: metricReason('⭐', `+${gained} stars`) };
};

const collaborator: Rule = (ctx) => {
  const reviews = ctx.metrics.reviews;
  if (reviews < COLLAB_MIN_ABSOLUTE) return null;
  const baselineAvgReviews = ctx.baseline?.avgReviews ?? 0;
  if (reviews < baselineAvgReviews * COLLAB_GROWTH_MULTIPLIER) return null;
  return { archetype: 'Collaborator', reason: metricReason('👀', `+${reviews} reviews`) };
};

const openSourceContributor: Rule = (ctx) => {
  const m = ctx.metrics;
  if (m.externalPRs >= OSS_MIN_EXTERNAL_PRS && m.externalReposContributed >= OSS_MIN_EXTERNAL_REPOS) {
    return { archetype: 'Open Source Contributor', reason: metricReason('🔀', `+${m.externalPRs} ext PRs`) };
  }
  return null;
};

const builder: Rule = (ctx) => {
  const m = ctx.metrics;
  if (m.reposActive >= BUILDER_MIN_ACTIVE_REPOS && m.longLivedRepoCount >= BUILDER_MIN_LONG_LIVED) {
    return { archetype: 'Builder', reason: metricReason('📦', `${m.longLivedRepoCount} long-lived`) };
  }
  return null;
};

const creator: Rule = (ctx) => {
  const m = ctx.metrics;
  if (m.reposCreated >= CREATOR_MIN_REPOS_CREATED) {
    return { archetype: 'Creator', reason: metricReason('🛠️', `+${m.reposCreated} repos`) };
  }
  return null;
};

const explorer: Rule = (ctx) => {
  const m = ctx.metrics;
  if (m.newLanguageCount >= EXPLORER_MIN_NEW_LANGS && distinctLanguageCount(m) >= EXPLORER_MIN_BREADTH) {
    return { archetype: 'Explorer', reason: metricReason('🌱', `+${m.newLanguageCount} langs`) };
  }
  return null;
};

const polyglot: Rule = (ctx) => {
  const breadth = distinctLanguageCount(ctx.metrics);
  const baselineBreadth = ctx.baseline?.avgLanguageBreadth ?? 0;
  if (breadth >= POLYGLOT_MIN_BREADTH && baselineBreadth >= POLYGLOT_MIN_BREADTH) {
    return { archetype: 'Polyglot', reason: metricReason('🌐', `${breadth} langs active`) };
  }
  return null;
};

const specialist: Rule = (ctx) => {
  const m = ctx.metrics;
  const breadth = distinctLanguageCount(m);
  const depth = dominantLanguageShare(m);
  if (
    ctx.sameLanguageStreakYears >= SPECIALIST_MIN_STREAK_YEARS &&
    breadth <= SPECIALIST_MAX_BREADTH &&
    depth >= SPECIALIST_MIN_DEPTH_SHARE
  ) {
    const lang = dominantLanguage(m);
    if (lang) {
      return { archetype: 'Specialist', reason: { kind: 'language', emoji: languageEmoji(lang), label: lang } };
    }
  }
  return null;
};

const consistent: Rule = (ctx) => ({
  archetype: 'Consistent',
  reason: metricReason('🔥', `${ctx.metrics.longestStreakDays}d streak`),
});

const RULES: Rule[] = [
  quietYear,
  risingStar,
  collaborator,
  openSourceContributor,
  builder,
  creator,
  explorer,
  polyglot,
  specialist,
  consistent,
];

export function evaluateYear(ctx: YearContext): JourneyYear {
  for (const rule of RULES) {
    const match = rule(ctx);
    if (match) {
      return { year: ctx.metrics.year, archetype: match.archetype, reason: match.reason, isCurrent: ctx.isCurrent };
    }
  }
  // consistent always matches, so this is unreachable — kept for type safety.
  throw new Error('no rule matched, including the unconditional fallback');
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/rules/index.test.ts`
Expected: PASS (14 tests).

- [ ] **Step 5: Commit**

```bash
git add src/rules/index.ts src/rules/index.test.ts
git commit -m "Add 10-archetype Rule Engine with precedence ordering"
```

---

### Task 4: Renderer

**Files:**
- Create: `src/render/index.ts`
- Test: `src/render/index.test.ts`

**Interfaces:**
- Consumes: `JourneyYear`, `YearlyMetrics` (Task 1), `dominantLanguage` (Task 1)
- Produces:
  ```ts
  export function renderPinHeadline(years: JourneyYear[]): string;
  export function renderGistBody(
    username: string,
    displayName: string,
    years: JourneyYear[],
    metrics: YearlyMetrics[]
  ): string;
  ```

- [ ] **Step 1: Write the failing tests**

`src/render/index.test.ts`:
```ts
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/render/index.test.ts`
Expected: FAIL — `./index` module not found.

- [ ] **Step 3: Implement `src/render/index.ts`**

```ts
import type { JourneyYear, Reason, YearlyMetrics } from '../types';
import { dominantLanguage } from '../metrics/language';

function renderReason(reason: Reason): string {
  return reason.kind === 'language' ? `${reason.emoji} ${reason.label}` : `${reason.icon} ${reason.text}`;
}

function renderLine(year: JourneyYear): string {
  const marker = year.isCurrent ? ' ●' : '';
  return `${year.year}${marker} ${year.archetype} · ${renderReason(year.reason)}`;
}

export function renderPinHeadline(years: JourneyYear[]): string {
  return years.map(renderLine).join('\n');
}

function renderBreakdownTable(metrics: YearlyMetrics[]): string {
  const header = '| Year | Top Language | Active Repos | Long-lived | Commit Days | Longest Streak | Own PRs | Ext PRs | Reviews | Stars |';
  const divider = '|---|---|---|---|---|---|---|---|---|---|';
  const rows = metrics.map((m) => {
    const lang = dominantLanguage(m) ?? '—';
    return `| ${m.year} | ${lang} | ${m.reposActive} | ${m.longLivedRepoCount} | ${m.commitDays} | ${m.longestStreakDays}d | ${m.ownPRs} | ${m.externalPRs} | ${m.reviews} | ${m.starsGained} |`;
  });
  return [header, divider, ...rows].join('\n');
}

export function renderGistBody(
  username: string,
  displayName: string,
  years: JourneyYear[],
  metrics: YearlyMetrics[]
): string {
  const headline = renderPinHeadline(years);
  const first = years[0];
  const last = years[years.length - 1];
  const synthesis =
    first && last
      ? `Your Developer Journey: you started as ${first.archetype} in ${first.year}, and by ${last.year} you were ${last.archetype}.`
      : '';
  return [
    `# ${displayName} (@${username})`,
    '',
    headline,
    '',
    '---',
    '',
    '## Year-by-year breakdown',
    '',
    renderBreakdownTable(metrics),
    '',
    '---',
    '',
    synthesis,
    '',
  ].join('\n');
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/render/index.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add src/render/index.ts src/render/index.test.ts
git commit -m "Add pin headline and gist body renderer"
```

---

### Task 5: Metrics assembly (raw → YearlyMetrics)

**Files:**
- Create: `src/fetch/types.ts`
- Create: `src/metrics/index.ts`
- Test: `src/metrics/index.test.ts`

**Interfaces:**
- Consumes: `YearlyMetrics` (Task 1)
- Produces:
  ```ts
  // src/fetch/types.ts
  export interface RawYearData {
    year: number;
    repos: Array<{ createdAt: string; pushedAt: string; languages: Record<string, number> }>;
    contributionCalendar: {
      weeks: Array<{ contributionDays: Array<{ date: string; contributionCount: number }> }>;
    };
    ownPRCount: number;
    externalPRCount: number;
    externalRepoCount: number;
    reviewCount: number;
    starsGainedThisYear: number;
  }
  ```
  ```ts
  // src/metrics/index.ts
  export function toYearlyMetrics(raw: RawYearData, priorLanguages: ReadonlySet<string>): YearlyMetrics;
  ```

- [ ] **Step 1: Write `src/fetch/types.ts`**

Use the exact `RawYearData` interface from the Interfaces section above.

- [ ] **Step 2: Write the failing tests**

`src/metrics/index.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { toYearlyMetrics } from './index';
import type { RawYearData } from '../fetch/types';

function raw(overrides: Partial<RawYearData>): RawYearData {
  return {
    year: 2024,
    repos: [],
    contributionCalendar: { weeks: [] },
    ownPRCount: 0,
    externalPRCount: 0,
    externalRepoCount: 0,
    reviewCount: 0,
    starsGainedThisYear: 0,
    ...overrides,
  };
}

describe('toYearlyMetrics', () => {
  it('sums language bytes across repos pushed in the target year', () => {
    const data = raw({
      repos: [
        { createdAt: '2020-01-01T00:00:00Z', pushedAt: '2024-06-01T00:00:00Z', languages: { Python: 100 } },
        { createdAt: '2020-01-01T00:00:00Z', pushedAt: '2024-07-01T00:00:00Z', languages: { Python: 50, Go: 20 } },
        { createdAt: '2020-01-01T00:00:00Z', pushedAt: '2023-01-01T00:00:00Z', languages: { Rust: 999 } },
      ],
    });
    const result = toYearlyMetrics(data, new Set());
    expect(result.languageBytes).toEqual({ Python: 150, Go: 20 });
  });

  it('counts new languages not seen in prior years', () => {
    const data = raw({
      repos: [{ createdAt: '2024-01-01T00:00:00Z', pushedAt: '2024-01-01T00:00:00Z', languages: { Python: 1, Go: 1 } }],
    });
    const result = toYearlyMetrics(data, new Set(['Python']));
    expect(result.newLanguageCount).toBe(1);
  });

  it('counts repos created in the target year', () => {
    const data = raw({
      repos: [
        { createdAt: '2024-03-01T00:00:00Z', pushedAt: '2024-03-01T00:00:00Z', languages: {} },
        { createdAt: '2023-03-01T00:00:00Z', pushedAt: '2024-03-01T00:00:00Z', languages: {} },
      ],
    });
    expect(toYearlyMetrics(data, new Set()).reposCreated).toBe(1);
  });

  it('counts repos active (pushed) in the target year', () => {
    const data = raw({
      repos: [
        { createdAt: '2020-01-01T00:00:00Z', pushedAt: '2024-03-01T00:00:00Z', languages: {} },
        { createdAt: '2020-01-01T00:00:00Z', pushedAt: '2023-03-01T00:00:00Z', languages: {} },
      ],
    });
    expect(toYearlyMetrics(data, new Set()).reposActive).toBe(1);
  });

  it('counts long-lived repos as active repos at least a year old', () => {
    const data = raw({
      repos: [
        { createdAt: '2023-01-01T00:00:00Z', pushedAt: '2024-06-01T00:00:00Z', languages: {} }, // ~17mo old
        { createdAt: '2024-05-01T00:00:00Z', pushedAt: '2024-06-01T00:00:00Z', languages: {} }, // ~1mo old
      ],
    });
    expect(toYearlyMetrics(data, new Set()).longLivedRepoCount).toBe(1);
  });

  it('counts commit days and active months within the target year only', () => {
    const data = raw({
      contributionCalendar: {
        weeks: [
          {
            contributionDays: [
              { date: '2024-01-05', contributionCount: 2 },
              { date: '2024-01-06', contributionCount: 0 },
              { date: '2024-02-01', contributionCount: 1 },
              { date: '2023-12-31', contributionCount: 5 },
            ],
          },
        ],
      },
    });
    const result = toYearlyMetrics(data, new Set());
    expect(result.commitDays).toBe(2);
    expect(result.activeMonths).toBe(2);
  });

  it('computes the longest consecutive-day streak within the target year', () => {
    const data = raw({
      contributionCalendar: {
        weeks: [
          {
            contributionDays: [
              { date: '2024-01-01', contributionCount: 1 },
              { date: '2024-01-02', contributionCount: 1 },
              { date: '2024-01-03', contributionCount: 0 },
              { date: '2024-01-04', contributionCount: 1 },
              { date: '2024-01-05', contributionCount: 1 },
              { date: '2024-01-06', contributionCount: 1 },
            ],
          },
        ],
      },
    });
    expect(toYearlyMetrics(data, new Set()).longestStreakDays).toBe(3);
  });

  it('passes PR, review, and star fields through unchanged', () => {
    const data = raw({ ownPRCount: 4, externalPRCount: 7, externalRepoCount: 3, reviewCount: 12, starsGainedThisYear: 58 });
    const result = toYearlyMetrics(data, new Set());
    expect(result.ownPRs).toBe(4);
    expect(result.externalPRs).toBe(7);
    expect(result.externalReposContributed).toBe(3);
    expect(result.reviews).toBe(12);
    expect(result.starsGained).toBe(58);
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx vitest run src/metrics/index.test.ts`
Expected: FAIL — `./index` module not found.

- [ ] **Step 4: Implement `src/metrics/index.ts`**

```ts
import type { YearlyMetrics } from '../types';
import type { RawYearData } from '../fetch/types';

const MS_PER_YEAR = 365.25 * 24 * 60 * 60 * 1000;

function yearOf(dateIso: string): number {
  return new Date(dateIso).getUTCFullYear();
}

function computeLongestStreak(raw: RawYearData): number {
  const days = raw.contributionCalendar.weeks
    .flatMap((w) => w.contributionDays)
    .filter((d) => yearOf(d.date) === raw.year)
    .sort((a, b) => a.date.localeCompare(b.date));
  let longest = 0;
  let current = 0;
  for (const day of days) {
    if (day.contributionCount > 0) {
      current++;
      longest = Math.max(longest, current);
    } else {
      current = 0;
    }
  }
  return longest;
}

export function toYearlyMetrics(raw: RawYearData, priorLanguages: ReadonlySet<string>): YearlyMetrics {
  const activeRepos = raw.repos.filter((r) => yearOf(r.pushedAt) === raw.year);
  const createdRepos = raw.repos.filter((r) => yearOf(r.createdAt) === raw.year);

  const languageBytes: Record<string, number> = {};
  for (const repo of activeRepos) {
    for (const [lang, bytes] of Object.entries(repo.languages)) {
      languageBytes[lang] = (languageBytes[lang] ?? 0) + bytes;
    }
  }

  const newLanguageCount = Object.keys(languageBytes).filter((lang) => !priorLanguages.has(lang)).length;

  const longLivedRepoCount = activeRepos.filter((r) => {
    const ageMs = new Date(r.pushedAt).getTime() - new Date(r.createdAt).getTime();
    return ageMs >= MS_PER_YEAR;
  }).length;

  const daysInYear = raw.contributionCalendar.weeks
    .flatMap((w) => w.contributionDays)
    .filter((d) => yearOf(d.date) === raw.year && d.contributionCount > 0);

  const commitDays = daysInYear.length;
  const activeMonths = new Set(daysInYear.map((d) => new Date(d.date).getUTCMonth())).size;
  const longestStreakDays = computeLongestStreak(raw);

  return {
    year: raw.year,
    languageBytes,
    newLanguageCount,
    reposCreated: createdRepos.length,
    reposActive: activeRepos.length,
    longLivedRepoCount,
    activeMonths,
    commitDays,
    longestStreakDays,
    ownPRs: raw.ownPRCount,
    externalPRs: raw.externalPRCount,
    externalReposContributed: raw.externalRepoCount,
    reviews: raw.reviewCount,
    starsGained: raw.starsGainedThisYear,
  };
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/metrics/index.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 6: Commit**

```bash
git add src/fetch/types.ts src/metrics/index.ts src/metrics/index.test.ts
git commit -m "Add raw-to-YearlyMetrics assembly"
```

---

### Task 6: GitHub fetcher

**Files:**
- Create: `src/fetch/github.ts`
- Test: `src/fetch/github.test.ts`

**Interfaces:**
- Consumes: `RawYearData` (Task 5)
- Produces:
  ```ts
  export function fetchAccountCreatedYear(octokit: OctokitLike, username: string): Promise<number>;
  export function fetchRawYear(octokit: OctokitLike, username: string, year: number): Promise<RawYearData>;
  ```
  where `OctokitLike` is a minimal structural type (defined in this task) covering only the
  Octokit methods actually called, so tests can pass a plain mock object instead of a real
  `@octokit/rest` instance.

- [ ] **Step 1: Write the failing tests**

`src/fetch/github.test.ts`:
```ts
import { describe, it, expect, vi } from 'vitest';
import { fetchAccountCreatedYear, fetchRawYear } from './github';

function makeOctokit(overrides: Record<string, any> = {}) {
  return {
    rest: {
      users: { getByUsername: vi.fn().mockResolvedValue({ data: { created_at: '2020-05-01T00:00:00Z' } }) },
      repos: {
        listForUser: vi.fn().mockResolvedValue({
          data: [{ name: 'proj-a', created_at: '2024-01-01T00:00:00Z', pushed_at: '2024-06-01T00:00:00Z' }],
        }),
        listLanguages: vi.fn().mockResolvedValue({ data: { Python: 500 } }),
      },
      search: {
        issuesAndPullRequests: vi.fn().mockResolvedValue({ data: { total_count: 4 } }),
      },
      activity: {
        listStargazersForRepo: vi.fn().mockResolvedValue({ data: [{ starred_at: '2024-03-01T00:00:00Z' }] }),
      },
    },
    graphql: vi.fn().mockResolvedValue({
      user: {
        contributionsCollection: {
          contributionCalendar: { weeks: [{ contributionDays: [{ date: '2024-01-05', contributionCount: 3 }] }] },
        },
      },
    }),
    ...overrides,
  };
}

describe('fetchAccountCreatedYear', () => {
  it('reads the account creation year from the users API', async () => {
    const octokit = makeOctokit();
    await expect(fetchAccountCreatedYear(octokit as any, 'seuthootDev')).resolves.toBe(2020);
    expect(octokit.rest.users.getByUsername).toHaveBeenCalledWith({ username: 'seuthootDev' });
  });
});

describe('fetchRawYear', () => {
  it('assembles repos with their languages', async () => {
    const octokit = makeOctokit();
    const result = await fetchRawYear(octokit as any, 'seuthootDev', 2024);
    expect(result.repos).toEqual([
      { createdAt: '2024-01-01T00:00:00Z', pushedAt: '2024-06-01T00:00:00Z', languages: { Python: 500 } },
    ]);
  });

  it('carries the requested year and contribution calendar through', async () => {
    const octokit = makeOctokit();
    const result = await fetchRawYear(octokit as any, 'seuthootDev', 2024);
    expect(result.year).toBe(2024);
    expect(result.contributionCalendar.weeks[0].contributionDays[0].contributionCount).toBe(3);
  });

  it('queries own and external PR counts with year-scoped search queries', async () => {
    const octokit = makeOctokit();
    await fetchRawYear(octokit as any, 'seuthootDev', 2024);
    const calls = octokit.rest.search.issuesAndPullRequests.mock.calls.map((c: any[]) => c[0].q);
    expect(calls).toContain('author:seuthootDev type:pr created:2024-01-01..2024-12-31 user:seuthootDev');
    expect(calls).toContain('author:seuthootDev type:pr created:2024-01-01..2024-12-31 -user:seuthootDev');
    expect(calls).toContain('reviewed-by:seuthootDev type:pr created:2024-01-01..2024-12-31');
  });

  it('counts stars gained in the target year from stargazer timestamps', async () => {
    const octokit = makeOctokit();
    const result = await fetchRawYear(octokit as any, 'seuthootDev', 2024);
    expect(result.starsGainedThisYear).toBe(1);
  });

  it('counts distinct external repos from the external-PR search results', async () => {
    const octokit = makeOctokit({
      rest: {
        ...makeOctokit().rest,
        search: {
          issuesAndPullRequests: vi
            .fn()
            .mockResolvedValueOnce({ data: { total_count: 2, items: [] } }) // own PRs
            .mockResolvedValueOnce({
              data: {
                total_count: 2,
                items: [
                  { repository_url: 'https://api.github.com/repos/foo/bar' },
                  { repository_url: 'https://api.github.com/repos/foo/bar' },
                ],
              },
            }) // external PRs
            .mockResolvedValueOnce({ data: { total_count: 0, items: [] } }), // reviews
        },
      },
    });
    const result = await fetchRawYear(octokit as any, 'seuthootDev', 2024);
    expect(result.externalRepoCount).toBe(1);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/fetch/github.test.ts`
Expected: FAIL — `./github` module not found.

- [ ] **Step 3: Implement `src/fetch/github.ts`**

```ts
import type { RawYearData } from './types';

export interface OctokitLike {
  rest: {
    users: { getByUsername(params: { username: string }): Promise<{ data: { created_at: string } }> };
    repos: {
      listForUser(params: {
        username: string;
        per_page: number;
      }): Promise<{ data: Array<{ name: string; created_at: string; pushed_at: string }> }>;
      listLanguages(params: { owner: string; repo: string }): Promise<{ data: Record<string, number> }>;
    };
    search: {
      issuesAndPullRequests(params: {
        q: string;
      }): Promise<{ data: { total_count: number; items?: Array<{ repository_url: string }> } }>;
    };
    activity: {
      listStargazersForRepo(params: {
        owner: string;
        repo: string;
        headers: Record<string, string>;
        per_page: number;
      }): Promise<{ data: Array<{ starred_at?: string }> }>;
    };
  };
  graphql(query: string, variables: Record<string, unknown>): Promise<any>;
}

export async function fetchAccountCreatedYear(octokit: OctokitLike, username: string): Promise<number> {
  const { data } = await octokit.rest.users.getByUsername({ username });
  return new Date(data.created_at).getUTCFullYear();
}

const CONTRIBUTIONS_QUERY = `
  query($username: String!, $from: DateTime!, $to: DateTime!) {
    user(login: $username) {
      contributionsCollection(from: $from, to: $to) {
        contributionCalendar {
          weeks { contributionDays { date contributionCount } }
        }
      }
    }
  }
`;

export async function fetchRawYear(octokit: OctokitLike, username: string, year: number): Promise<RawYearData> {
  const { data: repoList } = await octokit.rest.repos.listForUser({ username, per_page: 100 });

  const repos = await Promise.all(
    repoList.map(async (repo) => {
      const { data: languages } = await octokit.rest.repos.listLanguages({ owner: username, repo: repo.name });
      return { createdAt: repo.created_at, pushedAt: repo.pushed_at, languages };
    })
  );

  const from = `${year}-01-01T00:00:00Z`;
  const to = `${year}-12-31T23:59:59Z`;
  const dateRange = `${year}-01-01..${year}-12-31`;

  const contributions = await octokit.graphql(CONTRIBUTIONS_QUERY, { username, from, to });
  const contributionCalendar = contributions.user.contributionsCollection.contributionCalendar;

  const { data: ownPRs } = await octokit.rest.search.issuesAndPullRequests({
    q: `author:${username} type:pr created:${dateRange} user:${username}`,
  });
  const { data: externalPRs } = await octokit.rest.search.issuesAndPullRequests({
    q: `author:${username} type:pr created:${dateRange} -user:${username}`,
  });
  const { data: reviews } = await octokit.rest.search.issuesAndPullRequests({
    q: `reviewed-by:${username} type:pr created:${dateRange}`,
  });
  const externalRepoNames = new Set((externalPRs.items ?? []).map((item) => item.repository_url));

  let starsGainedThisYear = 0;
  for (const repo of repoList) {
    const { data: stargazers } = await octokit.rest.activity.listStargazersForRepo({
      owner: username,
      repo: repo.name,
      headers: { accept: 'application/vnd.github.star+json' },
      per_page: 100,
    });
    for (const s of stargazers) {
      if (s.starred_at && new Date(s.starred_at).getUTCFullYear() === year) {
        starsGainedThisYear++;
      }
    }
  }

  return {
    year,
    repos,
    contributionCalendar,
    ownPRCount: ownPRs.total_count,
    externalPRCount: externalPRs.total_count,
    externalRepoCount: externalRepoNames.size,
    reviewCount: reviews.total_count,
    starsGainedThisYear,
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/fetch/github.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/fetch/github.ts src/fetch/github.test.ts
git commit -m "Add GitHub REST/GraphQL fetcher for per-year raw data"
```

---

### Task 7: Gist writer

**Files:**
- Create: `src/gist.ts`
- Test: `src/gist.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export function updateGist(
    octokit: { rest: { gists: { update(params: { gist_id: string; files: Record<string, { content: string }> }): Promise<unknown> } } },
    gistId: string,
    filename: string,
    content: string
  ): Promise<void>;
  ```

- [ ] **Step 1: Write the failing test**

`src/gist.test.ts`:
```ts
import { describe, it, expect, vi } from 'vitest';
import { updateGist } from './gist';

describe('updateGist', () => {
  it('PATCHes the gist with the given filename and content', async () => {
    const update = vi.fn().mockResolvedValue({});
    const octokit = { rest: { gists: { update } } };
    await updateGist(octokit as any, 'abc123', 'journey.md', 'hello world');
    expect(update).toHaveBeenCalledWith({ gist_id: 'abc123', files: { 'journey.md': { content: 'hello world' } } });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/gist.test.ts`
Expected: FAIL — `./gist` module not found.

- [ ] **Step 3: Implement `src/gist.ts`**

```ts
export interface GistOctokitLike {
  rest: {
    gists: {
      update(params: { gist_id: string; files: Record<string, { content: string }> }): Promise<unknown>;
    };
  };
}

export async function updateGist(
  octokit: GistOctokitLike,
  gistId: string,
  filename: string,
  content: string
): Promise<void> {
  await octokit.rest.gists.update({ gist_id: gistId, files: { [filename]: { content } } });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/gist.test.ts`
Expected: PASS (1 test).

- [ ] **Step 5: Commit**

```bash
git add src/gist.ts src/gist.test.ts
git commit -m "Add Gist update helper"
```

---

### Task 8: CLI orchestration

**Files:**
- Create: `src/cli.ts`
- Test: `src/cli.test.ts`

**Interfaces:**
- Consumes: `fetchAccountCreatedYear`, `fetchRawYear`, `OctokitLike` (Task 6); `toYearlyMetrics` (Task 5);
  `buildYearContexts` (Task 2); `evaluateYear` (Task 3); `renderPinHeadline`, `renderGistBody` (Task 4);
  `updateGist`, `GistOctokitLike` (Task 7)
- Produces:
  ```ts
  export interface JourneyResult { pinHeadline: string; gistBody: string; }
  export async function buildJourney(
    octokit: OctokitLike,
    opts: { username: string; displayName: string; maxYears: number; now?: Date }
  ): Promise<JourneyResult>;
  ```

- [ ] **Step 1: Write the failing tests**

`src/cli.test.ts`:
```ts
import { describe, it, expect, vi } from 'vitest';
import { buildJourney } from './cli';

function makeOctokit() {
  return {
    rest: {
      users: { getByUsername: vi.fn().mockResolvedValue({ data: { created_at: '2024-01-01T00:00:00Z' } }) },
      repos: {
        listForUser: vi.fn().mockResolvedValue({
          data: [{ name: 'proj', created_at: '2024-01-01T00:00:00Z', pushed_at: '2024-06-01T00:00:00Z' }],
        }),
        listLanguages: vi.fn().mockResolvedValue({ data: { Python: 100 } }),
      },
      search: {
        issuesAndPullRequests: vi.fn().mockResolvedValue({ data: { total_count: 0, items: [] } }),
      },
      activity: { listStargazersForRepo: vi.fn().mockResolvedValue({ data: [] }) },
    },
    graphql: vi.fn().mockResolvedValue({
      user: { contributionsCollection: { contributionCalendar: { weeks: [] } } },
    }),
  };
}

describe('buildJourney', () => {
  it('produces a 5-line pin headline for an account exactly 5 years old', async () => {
    const octokit = makeOctokit();
    octokit.rest.users.getByUsername = vi
      .fn()
      .mockResolvedValue({ data: { created_at: '2022-01-01T00:00:00Z' } });
    const result = await buildJourney(octokit as any, {
      username: 'seuthootDev',
      displayName: 'Jung Seunghoon',
      maxYears: 5,
      now: new Date('2026-08-22T00:00:00Z'),
    });
    expect(result.pinHeadline.split('\n')).toHaveLength(5);
  });

  it('produces fewer lines for a younger account, capped at maxYears', async () => {
    const octokit = makeOctokit(); // created_at 2024-01-01
    const result = await buildJourney(octokit as any, {
      username: 'seuthootDev',
      displayName: 'Jung Seunghoon',
      maxYears: 5,
      now: new Date('2026-08-22T00:00:00Z'),
    });
    expect(result.pinHeadline.split('\n')).toHaveLength(3); // 2024, 2025, 2026
  });

  it('marks the current (now) year as current in the last line', async () => {
    const octokit = makeOctokit();
    const result = await buildJourney(octokit as any, {
      username: 'seuthootDev',
      displayName: 'Jung Seunghoon',
      maxYears: 5,
      now: new Date('2026-08-22T00:00:00Z'),
    });
    const lines = result.pinHeadline.split('\n');
    expect(lines[lines.length - 1]).toContain('2026');
    expect(lines[lines.length - 1]).toContain('●');
  });

  it('includes the pin headline inside the gist body', async () => {
    const octokit = makeOctokit();
    const result = await buildJourney(octokit as any, {
      username: 'seuthootDev',
      displayName: 'Jung Seunghoon',
      maxYears: 5,
      now: new Date('2026-08-22T00:00:00Z'),
    });
    expect(result.gistBody).toContain(result.pinHeadline);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/cli.test.ts`
Expected: FAIL — `./cli` module not found.

- [ ] **Step 3: Implement `src/cli.ts`**

```ts
import { Octokit } from '@octokit/rest';
import { fetchAccountCreatedYear, fetchRawYear, type OctokitLike } from './fetch/github';
import { toYearlyMetrics } from './metrics';
import { buildYearContexts } from './diff';
import { evaluateYear } from './rules';
import { renderPinHeadline, renderGistBody } from './render';
import { updateGist } from './gist';
import type { YearlyMetrics } from './types';

export interface JourneyResult {
  pinHeadline: string;
  gistBody: string;
}

export async function buildJourney(
  octokit: OctokitLike,
  opts: { username: string; displayName: string; maxYears: number; now?: Date }
): Promise<JourneyResult> {
  const now = opts.now ?? new Date();
  const currentYear = now.getUTCFullYear();
  const createdYear = await fetchAccountCreatedYear(octokit, opts.username);
  const firstYear = Math.max(createdYear, currentYear - opts.maxYears + 1);

  const years: number[] = [];
  for (let y = firstYear; y <= currentYear; y++) years.push(y);

  const priorLanguages = new Set<string>();
  const yearlyMetrics: YearlyMetrics[] = [];
  for (const year of years) {
    const raw = await fetchRawYear(octokit, opts.username, year);
    const metrics = toYearlyMetrics(raw, priorLanguages);
    Object.keys(metrics.languageBytes).forEach((lang) => priorLanguages.add(lang));
    yearlyMetrics.push(metrics);
  }

  const contexts = buildYearContexts(yearlyMetrics);
  const journeyYears = contexts.map(evaluateYear);

  return {
    pinHeadline: renderPinHeadline(journeyYears),
    gistBody: renderGistBody(opts.username, opts.displayName, journeyYears, yearlyMetrics),
  };
}

async function main() {
  const username = process.argv.find((a) => a.startsWith('--username='))?.split('=')[1] ?? process.env.USERNAME;
  const displayName = process.argv.find((a) => a.startsWith('--name='))?.split('=')[1] ?? username;
  const token = process.env.GH_TOKEN;
  const gistId = process.env.GIST_ID;

  if (!username) {
    console.error('Usage: github-journey --username=<login> [--name="Display Name"]');
    process.exit(1);
  }

  const octokit = new Octokit({ auth: token });
  const result = await buildJourney(octokit as unknown as OctokitLike, {
    username,
    displayName: displayName ?? username,
    maxYears: 5,
  });

  if (gistId && token) {
    await updateGist(octokit as any, gistId, 'journey.md', result.gistBody);
    console.log(`Updated gist ${gistId}`);
  } else {
    console.log(result.gistBody);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/cli.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/cli.ts src/cli.test.ts
git commit -m "Add CLI orchestration wiring fetch through render"
```

---

### Task 9: GitHub Action workflow

**Files:**
- Create: `.github/workflows/update-journey-gist.yml`
- Create: `test/workflow.test.ts`

**Interfaces:**
- Consumes: `npm run cli` (Task 1's `package.json` script), env vars `GH_TOKEN`, `GIST_ID`, `USERNAME`,
  `NAME` read by `src/cli.ts`'s `main()` (Task 8)

- [ ] **Step 1: Write the failing test**

`test/workflow.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { load } from 'js-yaml';

describe('update-journey-gist workflow', () => {
  const doc = load(readFileSync('.github/workflows/update-journey-gist.yml', 'utf8')) as any;

  it('is triggered by schedule and manual dispatch', () => {
    const triggers = Object.keys(doc.on);
    expect(triggers).toContain('schedule');
    expect(triggers).toContain('workflow_dispatch');
  });

  it('runs the CLI with the required secrets and variables as env', () => {
    const job = doc.jobs['update-gist'];
    const runStep = job.steps.find((s: any) => typeof s.run === 'string' && s.run.includes('npm run cli'));
    expect(runStep).toBeTruthy();
    expect(runStep.env).toMatchObject({
      GH_TOKEN: '${{ secrets.GH_TOKEN }}',
      GIST_ID: '${{ secrets.GIST_ID }}',
      USERNAME: '${{ vars.USERNAME }}',
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/workflow.test.ts`
Expected: FAIL — `ENOENT` reading the workflow file.

- [ ] **Step 3: Write `.github/workflows/update-journey-gist.yml`**

```yaml
name: Update Journey Gist

on:
  schedule:
    - cron: '0 0 * * *'
  workflow_dispatch: {}

jobs:
  update-gist:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run cli -- --username=$USERNAME --name="$NAME"
        env:
          GH_TOKEN: ${{ secrets.GH_TOKEN }}
          GIST_ID: ${{ secrets.GIST_ID }}
          USERNAME: ${{ vars.USERNAME }}
          NAME: ${{ vars.NAME }}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/workflow.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add .github/workflows/update-journey-gist.yml test/workflow.test.ts
git commit -m "Add scheduled GitHub Action to refresh the pinned Gist"
```

---

## Manual verification (not automated by the tasks above)

After Task 9, do these once, by hand, before considering v0.1 "done" for real use:

1. Run `npm run cli -- --username=<your-username>` locally with `GH_TOKEN` set to a PAT
   (`repo` read scope is enough for public data) and confirm the printed Gist body looks right
   for a real account.
2. Create a public Gist, note its ID, set it as `GIST_ID`/`GH_TOKEN` secrets and `USERNAME`
   variable on this repo (or a fork), run the workflow via `workflow_dispatch`, and confirm the
   Gist content updates.
3. Pin that Gist on the test profile and confirm the 5-line headline is what actually shows in
   the fold — this is the empirical check on the "no images in the pin fold" assumption flagged
   in the spec (§3). If it turns out richer formatting *is* possible, that's a follow-up, not a
   blocker for v0.1.
