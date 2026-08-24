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

function monthKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

function daysBetween(a: string, b: string): number {
  return Math.abs(new Date(a).getTime() - new Date(b).getTime()) / (1000 * 60 * 60 * 24);
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

export function selectMoreMoments(years: DetailedYearData[], hero: HeroMoment | null, max = 8): Moment[] {
  const candidates: Moment[] = [];
  const seen = new Set<string>(hero ? [`${hero.name}|${hero.date}`] : []);

  function add(moment: Moment | null) {
    if (!moment) return;
    if (hero && moment.name === hero.name) return;
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

  // Peak merge month + dominant repo that month (own + external merges combined)
  const allMerged = [...allOwnMerged, ...allExtMerged];
  if (allMerged.length > 0) {
    const byMonth = new Map<string, typeof allMerged>();
    for (const m of allMerged) {
      const key = monthKey(m.date);
      byMonth.set(key, [...(byMonth.get(key) ?? []), m]);
    }
    let peakMonth: string | null = null;
    let peakEvents: typeof allMerged = [];
    for (const [month, events] of byMonth) {
      if (events.length > peakEvents.length) {
        peakMonth = month;
        peakEvents = events;
      }
    }
    if (peakMonth) {
      const repoCounts = new Map<string, number>();
      for (const e of peakEvents) repoCounts.set(e.repo, (repoCounts.get(e.repo) ?? 0) + 1);
      const dominantRepo = [...repoCounts.entries()].reduce((a, b) => (b[1] > a[1] ? b : a))[0];
      const dominantEvents = peakEvents.filter((e) => e.repo === dominantRepo);
      add({ date: toDateOnly(dominantEvents[0].date), name: dominantRepo, why: `peak merge month (${peakEvents.length} merged)` });
    }
  }

  // Later star cluster: the earliest star on a *different* repo than firstStar
  const laterStar = earliest(
    allStars.filter((e) => e.repo !== firstStar?.repo),
    (e) => e.starredAt
  );
  if (laterStar) {
    const laterStarCount = allStars.filter((e) => e.repo === laterStar.repo).length;
    const why = laterStarCount > 1 ? `${laterStarCount} more stars land` : 'more stars land';
    add({ date: toDateOnly(laterStar.starredAt), name: laterStar.repo, why });
  }

  // Tier 2 (only used while candidates.length < max)
  if (candidates.length < max) {
    const firstContribYear = years.find((y) => y.firstContributionDay);
    const contribDate = firstContribYear?.firstContributionDay;
    if (contribDate && !(hero && daysBetween(contribDate, hero.date) <= 7)) {
      add({ date: contribDate, name: contribDate, why: 'first contribution day' });
    }
  }

  if (candidates.length < max) {
    const minYear = Math.min(...years.map((y) => y.year));
    const maxYear = Math.max(...years.map((y) => y.year));
    const allRepos = years.flatMap((y) => y.repos);
    let longLived: (typeof allRepos)[number] | null = null;
    let longLivedAgeDays = -1;
    for (const r of allRepos) {
      const ageDays = (new Date(r.pushedAt).getTime() - new Date(r.createdAt).getTime()) / (1000 * 60 * 60 * 24);
      const pushedYear = new Date(r.pushedAt).getUTCFullYear();
      if (ageDays >= 365 && pushedYear >= minYear && pushedYear <= maxYear && ageDays > longLivedAgeDays) {
        longLived = r;
        longLivedAgeDays = ageDays;
      }
    }
    if (longLived) {
      add({ date: toDateOnly(longLived.pushedAt), name: longLived.name, why: `longest-lived repo (${Math.round(longLivedAgeDays / 30)} months)` });
    }
  }

  if (candidates.length < max) {
    const dayCounts = new Map<string, number>();
    for (const y of years) {
      for (const date of y.commitDayDates) {
        const key = monthKey(date);
        dayCounts.set(key, (dayCounts.get(key) ?? 0) + 1);
      }
    }
    let peakMonth: string | null = null;
    let peakCount = 0;
    for (const [month, count] of dayCounts) {
      if (count > peakCount) {
        peakMonth = month;
        peakCount = count;
      }
    }
    if (peakMonth) {
      add({ date: `${peakMonth}-01`, name: peakMonth, why: `busiest month (${peakCount} commit days)` });
    }
  }

  return candidates.slice(0, max);
}
