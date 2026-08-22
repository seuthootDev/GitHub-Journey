export interface YearlyMetrics {
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
  externalReposContributed: number;
  reviews: number;
  starsGained: number;
}

export type Reason =
  | { kind: 'language'; emoji: string; label: string }
  | { kind: 'metric'; icon: string; text: string };

export type Archetype =
  | 'Quiet Year' | 'Rising Star' | 'Collaborator' | 'Open Source Contributor' | 'Builder'
  | 'Creator' | 'Explorer' | 'Polyglot' | 'Specialist' | 'Consistent';

export interface JourneyYear {
  year: number;
  archetype: Archetype;
  reason: Reason;
  isCurrent: boolean;
}
