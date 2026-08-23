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
