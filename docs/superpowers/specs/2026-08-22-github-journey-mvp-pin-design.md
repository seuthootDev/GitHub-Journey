# GitHub Journey — MVP v0.1 Design (Pinned Gist)

## 1. Goal

Analyze one GitHub user's public activity over their last N years (default: 5, or fewer if the
account is younger) and render it as a **pinned Gist** on their profile: a 5-line ASCII headline
(all GitHub shows in the pin fold) showing, year by year, what kind of developer they were —
not raw stat counters. Below the fold, the same Gist holds a fuller Markdown breakdown.

This is not "GitHub Stats" (a snapshot of current totals). It's "GitHub Journey" (how the person
got here) — see README section 3.

## 2. Scope

**In scope for v0.1** (per README section 17, restated for the pin):
- Data axes: Languages, Repositories, Commits, Pull Requests only
- Pipeline: GitHub API → Yearly Metrics → Year-over-Year Change → Rule Engine → Journey Events → Pin render
- Output: (a) the 5-line pin headline (b) the full Gist Markdown body

**Scope correction from earlier assumption:** we'd earlier assumed v0.1 needs no automation and
GitHub Actions was a v0.5 nice-to-have. That's wrong once the delivery mechanism is a *pinned
Gist* — per `github-readme-zodiac`'s proven pattern, a GitHub Action that fills the Gist (via
`GH_TOKEN` + `GIST_ID`) is the only way the pin actually gets kept up to date, and forking that
mechanism is how a user adopts this project at all. So the Action is core v0.1 infra, not deferred.
See [[github-journey-pin-mechanism]].

**Explicitly out of scope for v0.1** (unchanged from README's own roadmap):
- Framework/Library detection (v0.2)
- Deep external-contribution/review analysis beyond basic PR/review counts (v0.3)
- AI-generated summary, web dashboard, multi-range (3/5/10yr) selection (v1.0)
- The "polished SVG card" path zodiac mentions as a separate thing from pins — not needed here
  unless requested later

**Archetype scope correction:** README's illustrative examples use flavorful composite labels
("Backend Builder", "Application Developer"). Those require knowing the user's *tech domain*
(backend/frontend/etc.), which needs framework/library detection — explicitly v0.2 scope. For
v0.1, the pin uses the five canonical Rule Engine archetypes from README section 12 directly,
unadorned: **Explorer, Specialist, Builder, Open Source Contributor, Collaborator**. Composite
domain-flavored labels come in v0.2 once framework detection exists.

## 3. Pin card format

5 lines, one per analyzed year, oldest first. Current year gets a `●` marker. Each line:

```
{year} {Archetype} · {reason}
```

`{reason}` is whichever signal actually drove that year's Rule Engine match — never a fixed field,
never a fabricated one. Two reason shapes:

- **Language-driven** (Specialist): emoji mascot + language name, e.g. `🐍 Python`
- **Metric-driven** (Explorer, Builder, Open Source Contributor, Collaborator): icon + signed count + short label, e.g. `🔀 +7 ext PRs`

| Archetype | Rule Engine trigger (README §12) | Reason shown |
|---|---|---|
| Explorer | `new_languages >= 3 AND breadth > threshold` | `🌱 +N langs` |
| Specialist | `same_language >= 2y AND depth > threshold AND breadth < threshold` | `{lang emoji} {Language}` |
| Builder | `owned_repos_active > threshold AND long_lived_projects > threshold` | `📦 N long-lived` |
| Open Source Contributor | `external_prs > threshold AND external_repos > threshold` | `🔀 +N ext PRs` |
| Collaborator | `(reviews + external_prs + issues)` increase significantly | `👀 +N reviews` |

Evaluation order when a year matches more than one rule (highest precedence first):
`Collaborator > Open Source Contributor > Builder > Specialist > Explorer`.

Language mascot emoji: Python 🐍, Java ☕, JavaScript 💛, TypeScript 🔷, Go 🐹, Rust 🦀,
C/C++ ➕, C# 🎯, Kotlin 🟣, Swift 🐦 (extend as needed — see README §5.1 language list).

No image/logo icons: a pinned Gist's profile preview renders as a plain-text snippet, not
rendered Markdown/HTML, so only Unicode text (emoji included) is safe. Worth a one-time empirical
check (create a real test Gist, pin it) before we fully rely on this — flagged as a risk, not
blocking v0.1 implementation.

Example (5 years of real signal):

```
2022 Explorer · 🌱 +3 langs
2023 Specialist · 🐍 Python
2024 Specialist · 🔷 TypeScript
2025 Open Source Contributor · 🔀 +7 ext PRs
2026 ● Builder · 📦 5 long-lived
```

## 4. Full Gist body (below the fold)

The same Gist file continues past line 5 with a fuller Markdown breakdown — this part isn't
constrained by the pin fold. Content, reusing README §16's concepts in text form:
- Per-year table: languages used (with rough usage bars), repo counts (created/active/archived),
  commit consistency (active months, commit days, longest streak), PR split (own vs external)
- A closing one-line "Your Developer Journey" synthesis sentence, generated via a template keyed
  off which archetypes appeared and in what order (README §14) — not free-text/AI.

## 5. Architecture

```
GitHub REST + GraphQL API
        ↓
   Fetcher (per year)
        ↓
   Yearly Metrics
        ↓
  Year-over-Year Diff
        ↓
   Rule Engine  →  Archetype + Reason per year
        ↓
   Renderer  →  5-line headline + full Gist Markdown
        ↓
   CLI  →  stdout, or PATCH the Gist directly (GH_TOKEN + GIST_ID)
        ↓
GitHub Action (schedule + workflow_dispatch) runs the CLI on a fork,
using repo Secrets (GH_TOKEN, GIST_ID) and Variables (USERNAME) —
same operational shape as github-readme-zodiac.
```

Components (Node.js + TypeScript, per earlier decision):
- `src/fetch/` — Octokit REST (repos, languages-per-repo, PR search) + GraphQL
  (`contributionsCollection`, queried per calendar year since the API caps ranges at 1 year)
- `src/metrics/` — raw API responses → `YearlyMetrics` per year
- `src/diff/` — `YearlyMetrics[]` → year-over-year deltas
- `src/rules/` — pure functions: `(metrics, deltas) → { archetype, reason }`, precedence table above
- `src/render/` — `{year, archetype, reason}[]` → pin text + Gist Markdown body
- `src/cli.ts` — orchestrates the pipeline; `--username`, optional `--token`; if `GH_TOKEN`/`GIST_ID`
  env vars are set, PATCHes the Gist, otherwise prints to stdout
- `.github/workflows/update-journey-gist.yml` — scheduled + manual dispatch wrapper around the CLI

## 6. Data model (sketch)

```ts
interface YearlyMetrics {
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
  reviews: number;
}

type Reason =
  | { kind: 'language'; emoji: string; label: string }
  | { kind: 'metric'; icon: string; delta: number; label: string };

interface JourneyYear {
  year: number;
  archetype: 'Explorer' | 'Specialist' | 'Builder' | 'Open Source Contributor' | 'Collaborator';
  reason: Reason;
  isCurrent: boolean;
}
```

## 7. Error handling / edge cases

- Account younger than 5 years: use actual account-creation year as the start, not a padded/fake
  history.
- A year with no qualifying rule match: fall back to the lowest-precedence rule (Explorer) using
  whatever breadth/depth signal exists that year, rather than omitting the year (the pin's 5 lines
  are fixed to 5 years; the gist body already only covers `min(5, account_age_years)` years, so no
  padding is needed — just fewer lines if the account is under 5 years old).
- GitHub API rate limiting: fail with a clear CLI error; no silent partial output.

## 8. Testing

- Rule Engine: pure-function unit tests per archetype using fixture `YearlyMetrics`/deltas,
  including precedence-order cases (a year matching two rules at once).
- Renderer: exact-text snapshot tests for the 5-line headline (including width/emoji handling)
  and the full Gist body.
- Fetcher/metrics: not unit-testable against live GitHub without a fixture/mock layer — use
  recorded API fixtures rather than hitting the real API in tests.

## 9. Repo cleanup

`demo/journey-demo.svg` and `demo/README.md` were an earlier spike built on a wrong assumption
(pinned *repo README* + SVG image, not pinned *Gist* + ASCII text). Remove them as part of this
work — they don't represent the actual delivery mechanism.

## 10. Acceptance criteria (v0.1 done when)

- Running the CLI against a real GitHub username with a valid token produces a 5-line pin headline
  and full Gist body matching the format above, computed from that user's real yearly activity.
- Rule Engine unit tests cover all 5 archetypes and the precedence order.
- The GitHub Action workflow, given `GH_TOKEN`/`GIST_ID` secrets and a `USERNAME` variable on a
  forked repo, updates the target Gist on `workflow_dispatch` and on schedule.
