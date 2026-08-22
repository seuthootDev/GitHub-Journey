import type { YearlyMetrics } from '../types';
import { dominantLanguage, distinctLanguageCount } from '../metrics/language';

export interface YearlyBaseline {
  avgReviews: number;
  avgExternalPRs: number;
  avgStarsGained: number;
  avgReposCreated: number;
  avgReposActive: number;
  avgCommitDays: number;
  avgLanguageBreadth: number;
}

export interface YearContext {
  metrics: YearlyMetrics;
  baseline: YearlyBaseline | null;
  sameLanguageStreakYears: number;
  isCurrent: boolean;
}

function average(values: number[]): number {
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function computeBaseline(all: YearlyMetrics[], excludeIndex: number): YearlyBaseline | null {
  const others = all.filter((_, i) => i !== excludeIndex);
  if (others.length === 0) return null;
  return {
    avgReviews: average(others.map((m) => m.reviews)),
    avgExternalPRs: average(others.map((m) => m.externalPRs)),
    avgStarsGained: average(others.map((m) => m.starsGained)),
    avgReposCreated: average(others.map((m) => m.reposCreated)),
    avgReposActive: average(others.map((m) => m.reposActive)),
    avgCommitDays: average(others.map((m) => m.commitDays)),
    avgLanguageBreadth: average(others.map((m) => distinctLanguageCount(m))),
  };
}

function computeStreak(sorted: YearlyMetrics[], index: number): number {
  const lang = dominantLanguage(sorted[index]);
  if (lang === null) return 0;
  let streak = 1;
  for (let i = index - 1; i >= 0; i--) {
    if (dominantLanguage(sorted[i]) === lang) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

export function buildYearContexts(sortedByYearAsc: YearlyMetrics[]): YearContext[] {
  return sortedByYearAsc.map((metrics, index) => ({
    metrics,
    baseline: computeBaseline(sortedByYearAsc, index),
    sameLanguageStreakYears: computeStreak(sortedByYearAsc, index),
    isCurrent: index === sortedByYearAsc.length - 1,
  }));
}
