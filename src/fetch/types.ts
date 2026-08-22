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
