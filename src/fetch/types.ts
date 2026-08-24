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
  ownMergedCount: number;
  externalMergedCount: number;
  ownPROpenedEvents: Array<{ repo: string; date: string }>;
  externalPROpenedEvents: Array<{ repo: string; date: string }>;
  starEvents: Array<{ repo: string; starredAt: string }>;
  reviewEvents: Array<{ repo: string; date: string }>;
  issueEvents: Array<{ repo: string; date: string }>;
}
