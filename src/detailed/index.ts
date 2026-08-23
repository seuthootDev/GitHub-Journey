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
    ownMergedCount: raw.ownMergedCount,
    externalMergedCount: raw.externalMergedCount,
    ownPROpenedEvents: raw.ownPROpenedEvents,
    externalPROpenedEvents: raw.externalPROpenedEvents,
    starEvents: raw.starEvents,
    commitDayDates,
    firstContributionDay: commitDayDates[0] ?? null,
  };
}

export type { DetailedYearData } from './types';

export interface WindowTotals {
  commitDays: number;
  ownPRs: number;
  externalPRs: number;
  ownMerged: number;
  externalMerged: number;
  starsGained: number;
  reposCreated: number;
  longLivedRepoCount: number;
}

export function windowTotals(years: DetailedYearData[]): WindowTotals {
  return years.reduce(
    (acc, y) => ({
      commitDays: acc.commitDays + y.metrics.commitDays,
      ownPRs: acc.ownPRs + y.metrics.ownPRs,
      externalPRs: acc.externalPRs + y.metrics.externalPRs,
      ownMerged: acc.ownMerged + y.ownMergedCount,
      externalMerged: acc.externalMerged + y.externalMergedCount,
      starsGained: acc.starsGained + y.metrics.starsGained,
      reposCreated: acc.reposCreated + y.metrics.reposCreated,
      longLivedRepoCount: acc.longLivedRepoCount + y.metrics.longLivedRepoCount,
    }),
    {
      commitDays: 0,
      ownPRs: 0,
      externalPRs: 0,
      ownMerged: 0,
      externalMerged: 0,
      starsGained: 0,
      reposCreated: 0,
      longLivedRepoCount: 0,
    }
  );
}
