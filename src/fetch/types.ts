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
}
