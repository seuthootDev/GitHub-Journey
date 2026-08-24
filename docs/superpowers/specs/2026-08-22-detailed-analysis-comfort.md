# GitHub Journey — Detailed analysis (comfort layer)

Status: **spec**. Copy rules (§4–§8) plus delivery (§10) plus visual treatment (§3.1–§3.4).
The pin fold is unchanged. Not wired into `src/` yet.

Demo mapping today: `demo/detailed-card.svg`, `demo/detailed-gist.md`, `demo/compare.html`.
When implemented: also `demo/torvalds.svg` (famous-account fixture) and a short README note.

`demo/detailed-card.svg` is the current visual reference (2026-08-24 revision): a hero
moment, a paper background running the full card, an illustrated polaroid, and a 2-up
chart grid. See §3.1–§3.4 for what it establishes and what is still open.

---

## 1. Job to be done

The pin answers **what kind of year was this**.

The detailed view answers **I did show up — here is the proof, with names I remember**.

Charts alone feel empty because they are third-person measurements. Comfort comes from:

1. A **cumulative sentence** (the period, not the monthly wiggle)
2. **Named scenes** (dates + repo names — memory triggers)
3. A **report card** (the year table, with highs marked and a short reading)

Do not invent hours-worked, productivity scores, or GitHub achievement badges
(no official API; we already decided not to scrape or estimate those).

---

## 2. What we never do

- Shame a quiet year. 2024-style floors are the *start of the story*, not a grade of F.
- Pad empty slots with filler (“no PRs yet ✨”). Skip the slot; use the next fallback.
- Put merge/star language on an account that has none. The same block must still
  read as a complete sentence using commit days and repos.
- Guess. Every number and every scene must come from data we already fetch
  (or a small, exact extension of it — e.g. `merged_at`, first contribution day).
- Market this card as a profile README badge. Username URLs are for sharing
  and for the gist embed, not for shrinking the layout to a pin-sized widget.

---

## 3. Layout (top → bottom)

| Block | Role |
|---|---|
| Title + arc | `Quiet Year → Builder → Open Source Contributor` (same story as the pin) |
| **Hero moment** | Always the first public repo, shown big — an origin, not a stat. The photo you don't have. |
| **Cumulative sentence** | One or two lines. The hug. |
| **More moments** | Up to 8 dated, named moments (origin excluded — it's already the hero) — every tier 1 + tier 2 candidate the account has. The recall. |
| **Analysis** (label) | The hand-off: everything below is evidence, not headline. |
| Time series | Evidence. 2-up grid, one chart alone if the count is odd. Scale numbers on peaks. |
| **Report card** | Year rollup table + ★ on column highs + 1–2 lines of reading |
| Year notes | Title then prose, stacked (no side-by-side cards). Height follows copy. |

The pin stays ~5 lines. This document is only the long view. See §3.1–§3.4 for the hero,
color, and chart-grid rules established by `demo/detailed-card.svg`.

### 3.1 Hero moment

The detailed view opens on one moment, not a wall of text — the same instinct behind a
"memories" reel that opens on a single photo instead of a grid. This card has no real
photos to pull from (GitHub's public API doesn't give you one), so the hero is:

- **Always the first public repo** (`created_at`, oldest non-fork), never the "most
  impressive" scene. Predictable, works for every account (PR-less or not), and matches
  §5.4's rule that origin is the floor of the comeback story.
- Shown at hero scale (repo name ~28–30px, largest text on the card) with its date and a
  one-line caption, **not** listed again in More Moments (§5 changes below).
- Paired with a small illustrated **polaroid** standing in for the missing photo (§3.2) —
  this is what actually reads as "comfort" rather than a spec-sheet. Text color and size
  alone did not achieve this in review; the image did.

### 3.2 Illustrated polaroid

A hand-drawn vector polaroid (sprout in soil, warm sky-toned background, slightly
rotated, a washi-tape accent, a handwritten caption) sits next to the hero text. It is
generated once per card from a small fixed set of motifs — no photo API, no user upload.

- Motif set: keep small at launch. `sprout` (origin/first repo) is the only motif this
  spec defines. Additional motifs (e.g. a different illustration for a "peak" moment) are
  out of scope until there's a second use case.
- Rendered as native SVG paths (no raster image, no external asset) so the card stays a
  single self-contained file.
- Caption text uses a handwritten face (`Caveat`) with `cursive` as the CSS fallback.
  **Open item:** confirm the Google Fonts stylesheet actually loads when this SVG is
  referenced via `<img src="...">` in a GitHub gist/README — if it doesn't, the fallback
  is a generic cursive font, which is an acceptable but unverified degradation. Verify
  before shipping; do not block the spec on it.

### 3.3 Color and motion

The whole card is a warm paper background (`#faf3e6`-family) with ink-toned text — no
dark theme, no colored text. This replaced an earlier dark-card-with-amber-accent
direction and a flat white/black direction; neither read as "comfort" in review. A subtle
`feTurbulence` grain texture keeps the background from reading as a spec sheet.

- Text stays black/warm-gray only. Color lives in the illustration and in the (now
  darkened-for-light-background) chart line/bar colors — not in typography.
- **The whole card fades in on load, staggered, not just the memory zone.** Hero,
  cumulative sentence, and each of up to 8 More Moments fade first (CSS `@keyframes`,
  `opacity` + small `translateY`); the ANALYSIS divider, each chart-grid row, the
  report card, and year notes each get their own later fade-in group in that order, so
  the eye is led from memory → evidence the same way it reads top to bottom. All
  respect `prefers-reduced-motion`. **Open item:** confirm this animation actually
  plays when the SVG is embedded via `<img>` in a GitHub gist/README (some embed paths
  sanitize or freeze SVG animation) — verify before shipping; a static first-frame
  render is an acceptable fallback if it doesn't.

### 3.4 Chart grid

The 7 time-series/event charts render as a **2-column grid**, 3 rows of 2, with the
7th (Reviews + Issues) alone on its own full-width row at the end, before the report
card. Report card and year notes stay full width, unchanged in structure.

- Halving chart width means fewer inline peak-value callouts than a full-width chart
  could carry: each line/bar chart labels its **rising-edge peaks only** — up to 3 for
  a line, 2 for bars — skipping any point whose value repeats the immediately
  preceding point (a flat plateau at the top of a cumulative chart, e.g. STARS once
  new stars stop landing, gets one label at the point it *reached* that height, not one
  per month it stayed there). This is a legibility trade at small size, not a data cut
  — the renderer still has full monthly data; it just doesn't callout all of it.
- Reviews + Issues is a real event-strip chart, not a placeholder: reviews plot as
  small circles, issues as small squares, each at the month they happened, with a
  caption naming the real totals. It needs its own fetch (§9) since neither reviews
  nor issues previously carried a date, only a count.
- Each chart also carries a small year-tick label (e.g. "2024") under its x-axis at
  the start of each window year, so a reader can tell which end is which year without
  cross-referencing the report card.

---

## 4. Cumulative sentence

Build from **slots**. Walk the list. Use a slot only if the value is > 0.
Always emit at least the universal slot (commit days), so a PR-less / star-less
account still gets a real sentence.

### 4.1 Slot priority (impressive first, then universal)

| Priority | Slot | When to use | Why it sits here |
|---|---|---|---|
| 1 | External merged PRs | `extMerged > 0` | Collaboration. Most distinctive. |
| 2 | Stars gained | `starsGained > 0` | Someone else noticed. |
| 3 | Merged PRs (all authored) | `merged > 0` | Work landed. Stronger than “opened”. |
| 4 | PRs opened (own / ext) | `ownPRs + extPRs > 0` and merged is 0 | They shipped PRs that did not land (yet). |
| 5 | **Commit days** | always, if > 0 | Universal. Everyone with a contribution calendar has this. |
| 6 | Repos created / long-lived | if still thin after 5 | Builders with no PR culture. |

“Thin” means: after walking 1–5 we have fewer than **two** concrete numbers
besides the year span. Then add repos.

Commit days are **not** last because they are weak — they are last among the
*optional extras* in the first line, but they are **required** in the sentence.
Typical shape: one line of “you showed up N days”, then one line of the
highest-priority extras that exist.

### 4.2 Templates

**Both PR/star life and quiet life share the first line:**

> You showed up **{commitDays}** days in **{yearCount}** years.

**Second line — pick the first template that matches:**

| Condition | Line |
|---|---|
| `extMerged > 0` | `{opened} pull requests opened, {merged} merged — {extMerged} in someone else’s repo.` |
| `merged > 0` (no ext) | `{merged} of {opened} pull requests merged, all in your own repos.` |
| `opened > 0`, `merged = 0` | `{opened} pull requests opened. None merged in this window.` |
| `starsGained > 0` (and no PRs) | `{starsGained} stars landed on your repos.` |
| else | `{reposCreated} public repos. {longLived} lived past a year.` |

Stars can **also** appear as a short clause on a PR line when both exist
(`… merged. {starsGained} stars.`). Do not drop PRs to talk about stars;
PRs stay higher priority, stars append.

**Quiet-only example** (0 PRs, 0 stars):

> You showed up 47 days in 3 years.  
> 4 public repos. 1 lived past a year.

**PR-without-stars example:**

> You showed up 101 days in 3 years.  
> 24 of 24 pull requests merged, all in your own repos.

**Demo (seuthootDev, 2024–2026):**

> You showed up 241 days in 3 years.  
> 124 pull requests opened, 106 merged — 23 in someone else’s repo.

(Stars exist here but the PR line is already two facts; stars belong in Scenes
and the report card, not a third opening line.)

### 4.3 Hard limits

- Two lines max. No paragraph.
- No “even though you had no PRs”. Absence is handled by not mentioning PRs.
- Numbers are window totals (the same years as the pin, currently last 3).

---

## 5. Scenes (memory triggers)

A scene is `{date}  {name}  ·  {why}`. Name is a repo (or, for a first commit
day with no repo list, the date itself).

**Origin (first public repo) is no longer a scene.** Per §3.1 it is always promoted to
the hero block above the scenes list. Do not repeat it in More Moments — that would
duplicate what the hero already told.

Take **up to 8** — the full tier 1 + tier 2 candidate pool (5 + 3), origin excluded
since it's always the hero. Walk **tier 1 then tier 2**, skipping the origin candidate
specifically (§5.2 tier 1 "first public repo" is removed from this list; it is always
the hero, never optional). Skip any candidate whose data is missing. Do not backfill
with a weaker duplicate of something already picked (e.g. do not add "first own PR" if
"first own merge" is the same PR).

### 5.1 Tier 1 — more memorable (collaboration / recognition / landing)

Use these first. They are what people replay.

| Order | Candidate | Data | Skip if |
|---|---|---|---|
| 1 | First **external** PR that **merged** | search `author + is:merged + -user:me`, oldest `merged_at` | none |
| 2 | First **star** on an owned repo | stargazers `starred_at`, earliest | `starsGained = 0` |
| 3 | First **own** PR that merged | `author + is:merged + user:me`, oldest | none |
| 4 | Peak **merge** month + dominant repo that month | monthly merge bucket | `merged = 0` |
| 5 | Later star cluster (second repo that got stars) | same as 2, next repo | only one starred repo |

### 5.2 Tier 2 — still a real memory (creation / showing up)

Fill remaining slots. This is how a PR-less account still gets a list. (First public
repo used to lead this tier; it is now always the hero per §3.1/§5, never a scene.)

| Order | Candidate | Data | Skip if |
|---|---|---|---|
| 1 | First **contribution day** | contribution calendar, first `contributionCount > 0` | empty calendar |
| 2 | **Longest-lived** repo still touched in-window | `pushed_at - created_at` among active | none qualify |
| 3 | Peak **commit-days** month | monthly days with contributions | all zeros |
| 4 | First **language** that wasn’t the previous year’s (or first language ever) | yearly languageBytes | no languages |

### 5.3 How a quiet account looks

Origin (first repo) is always the hero (§3.1), never in this list. Example: 3 years, 47
commit days, 4 repos, 0 PRs, 0 stars → the hero is `first-repo` (2023-04), and More
Moments fills from tier 2:

```
hero:  2023-04   first-repo          · first public repo

2024-11   notes-app           · longest-lived (18 months)
2025-03                       · busiest month (11 commit days)
```

If first contribution day would land within 7 days of the hero's own date, skip it —
it's the same "I started" beat the hero already told.

### 5.4 Demo (seuthootDev) — why these four

Hero is the origin. Tier 1 fills the rest of the list; tier 2 was not needed:

| | Date | Name | Why |
|---|---|---|---|
| hero | 2024-09 | seuthootDev | first public repo |
| 1 | 2025-07 | hanghae99-backend-week1 | first own PR |
| 2 | 2026-01 | Distributed_MES | first external PR, merged |
| 3 | 2026-02 | qml-vtk-python-pyside6 | first star |
| 4 | 2026-08 | insight-terminal-ascii | four more stars |

Cap is 8 (the whole candidate pool; origin no longer competes for a slot). Since tier 1
has only 5 candidates and tier 2 has 3, hitting the cap means the account has every
kind of moment this spec tracks — a full list, not a truncated one.

---

## 6. Report card (the year table)

This **is** the year rollup, not a second table.

- One row per year in the window.
- ★ (`&#x2605;`, gold) on the **column maximum**. Ties (e.g. long-lived = 2 in
  two years) mark every tied high.
- Do not ★ zeros. Do not ★ a Quiet Year just to be nice.
- Current year may stay green; ★ is independent (gold mark on the number).

**Reading under the table (1–2 lines), not a legend dump:**

- What the ★ means (high mark in that column).
- One contrast that is actually interesting (demo: 2025 created the most
  repos; 2026 took days / PRs / merges / stars).
- If the earliest year is a floor: say so in comeback language
  (“the floor, not a failure”), never “you did nothing”.

Quiet-only report card still works: columns that are all zeros just have
no ★. Days / repos / new-repos will still have a high.

---

## 7. Charts

Keep as evidence under the "Analysis" hand-off (§3.4), in the 2-up grid. Peak labels
stay (similar curves, different scales), sized down to fit the half-width columns —
see §3.4 for what that trims. No extra "motivational" captions on the plots — the
sentence and scenes already did that job.

---

## 8. Year notes

Stacked **title + prose**, full width. No horizontal cards (empty card
chrome fights variable copy length; SVG height should follow the last line).

Tone: specific and kind. Same facts as today, less “dead Q4” as a verdict.
Quiet year = sparse calendar. Builder year = names of the cluster.
Contributor year = named external repos.

---

## 9. Data we need beyond the pin pipeline

Already in the pin path: commit days, own/ext PRs (opened), stars by year,
repos, languages, long-lived.

**Add when this view is implemented** (all official Search/GraphQL, no scrape):

| Field | Source |
|---|---|
| Merged own / merged ext / `merged_at` month | `type:pr is:merged` + `user:` / `-user:` |
| First contribution day | `contributionCalendar` (already fetched per year) |
| First starred-at per repo | `star+json` (already used for yearly stars) |
| Dated review events (repo + date) | `reviewed-by:` search items, not just `total_count` — needed so Reviews + Issues can plot points, not just count them |
| Dated issue events (repo + date) | `is:issue author:` search, new query — issues were not fetched at all before this view |

Out of scope: achievements, estimated hours, private-only activity.

---

## 10. Delivery

**Both**, with different jobs:

| Surface | What the user sees | In the pin fold? |
|---|---|---|
| Pinned gist (first ~5 lines) | Year labels + one-liner. Unchanged. | Yes. This is the product on the profile. |
| Gist body (click through) | The long journey: sentence, scenes, report card, and the SVG. | **No.** User opens the gist on purpose. |

The detailed view is **for the person looking back**, not a profile widget.
A username URL means it *could* be dropped into a README like other
profile decorations. That is not the goal. The card is tall on purpose
(charts + notes). Do not optimize it to fit a profile grid.

User-facing copy must not say “too big for your profile” or “don’t use it
as a badge”. Just: open the gist to see the full journey.

### 10.1 Gist (below the fold)

The same Action that already PATCHes `journey.md` also:

1. Appends the comfort layer *after* the pin lines (sentence + scenes as
   markdown, so it still reads if the image fails).
2. Writes `journey.svg` (or embeds a Pages URL to that file).

Opening `gist.github.com/YOU/GIST_ID` is how you “see how you’ve been
doing”. The pin still only shows the five headline lines.

### 10.2 Who draws the SVG: the Action. Not Vercel.

`renderDetailedSvg(...)` is a string builder in the CLI, same as
`renderGistBody` today. The workflow already runs that CLI daily (`cron`),
on `push` to `main`, and on `workflow_dispatch`. That cadence is enough —
a year of activity does not need a live server.

**No Vercel, no Workers, no on-demand `?username=` API.** Out of scope.

Where the bytes live after the Action runs:

- Prefer a second gist file (`journey.svg`) and `![](raw gist URL)` in
  `journey.md`, so a fork does not have to enable Pages.
- Optional: also publish the same file to `gh-pages` as
  `/u/{username}.svg` if we want a stable username URL later.

SVG height follows content (§8). Width stays ~840.

Public GitHub API is enough (same axes as the pin). Search’s 1,000-result
cap may truncate a Linus-scale PR list; do not fake the missing tail.

### 10.3 README (when this ships)

One short addition next to the existing “open the gist” line. Something
like:

> Open the gist to see the full journey (not shown in the pin).

Plus a still of the demo SVG (Torvalds, §10.4). No extra paragraph about
README badges, profile decoration, or card size.

### 10.4 Demo SVG (when this ships)

Replace the seuthootDev-only layout mock as the **public** example with a
well-known account: **`torvalds`**, last 3 years, same layout as §3,
real public data, fallbacks from §4–§5 (his story will be commit-heavy;
that is the point of the fallback rules).

File: `demo/torvalds.svg`. Keep `demo/detailed-card.svg` as the working
mock for seuthootDev if useful; README shows Torvalds.

---

## 11. Acceptance (when we implement)

Copy:

- A fixture with 0 PRs and 0 stars still produces a two-line cumulative
  sentence that never mentions pull requests or stars.
- A fixture with only own merged PRs never claims “someone else’s repo”.
- Hero is present for every account with at least one public repo, and is always the
  first public repo — never a "more impressive" scene, never absent when tier 1 has
  results.
- More Moments length is `0 ≤ n ≤ 8` and never repeats the hero's repo/date.
- Report card ★ count equals the number of columns that have a positive max
  (ties allowed).
- Chart grid renders 3 rows of 2 plus one solo full-width row for the 7th chart; report
  card and year notes stay full width below it.
- Every chart, the report card, and year notes each fade in as their own group,
  staggered after the memory zone (hero/moments) finishes, not just the memory zone.
- Reviews + Issues plots real dated points (circles for reviews, squares for issues)
  and a real count in its caption; it is never a permanently empty chart.
- A line/bar chart's peak labels never repeat the same value on adjacent points along
  a plateau — only the point where that value was first reached is labeled.

Pin and gist:

- Pin output (first 5 lines) is unchanged in role: no SVG, no scenes.
- The Action produces `journey.svg` on the same schedule as the pin
  (not on every page view).
- Gist body below the fold contains the sentence + scenes and an image
  of that SVG.
- README mentions opening the gist for the full journey. It does not
  mention profile badges or card size.
- No Vercel (or other live SVG API) is required.

Demo:

- `demo/torvalds.svg` exists, is generated by the same renderer, and is
  the screenshot in README.
