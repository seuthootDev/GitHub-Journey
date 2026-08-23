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
