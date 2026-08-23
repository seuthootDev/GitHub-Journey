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
