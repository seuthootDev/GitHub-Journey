import type { YearlyMetrics } from '../types';
import type { RawYearData } from '../fetch/types';

const MS_PER_YEAR = 365.25 * 24 * 60 * 60 * 1000;

function yearOf(dateIso: string): number {
  return new Date(dateIso).getUTCFullYear();
}

function computeLongestStreak(raw: RawYearData): number {
  const days = raw.contributionCalendar.weeks
    .flatMap((w) => w.contributionDays)
    .filter((d) => yearOf(d.date) === raw.year)
    .sort((a, b) => a.date.localeCompare(b.date));
  let longest = 0;
  let current = 0;
  for (const day of days) {
    if (day.contributionCount > 0) {
      current++;
      longest = Math.max(longest, current);
    } else {
      current = 0;
    }
  }
  return longest;
}

export function toYearlyMetrics(raw: RawYearData, priorLanguages: ReadonlySet<string>): YearlyMetrics {
  const activeRepoNameSet = new Set(raw.activeRepoNames);
  const activeRepos = raw.repos.filter((r) => activeRepoNameSet.has(r.name));
  const createdRepos = raw.repos.filter((r) => yearOf(r.createdAt) === raw.year);

  const languageBytes: Record<string, number> = {};
  for (const repo of activeRepos) {
    for (const [lang, bytes] of Object.entries(repo.languages)) {
      languageBytes[lang] = (languageBytes[lang] ?? 0) + bytes;
    }
  }

  const newLanguageCount = Object.keys(languageBytes).filter((lang) => !priorLanguages.has(lang)).length;

  const longLivedRepoCount = activeRepos.filter((r) => {
    const ageMs = new Date(r.pushedAt).getTime() - new Date(r.createdAt).getTime();
    return ageMs >= MS_PER_YEAR;
  }).length;

  const daysInYear = raw.contributionCalendar.weeks
    .flatMap((w) => w.contributionDays)
    .filter((d) => yearOf(d.date) === raw.year && d.contributionCount > 0);

  const commitDays = daysInYear.length;
  const activeMonths = new Set(daysInYear.map((d) => new Date(d.date).getUTCMonth())).size;
  const longestStreakDays = computeLongestStreak(raw);

  return {
    year: raw.year,
    languageBytes,
    newLanguageCount,
    reposCreated: createdRepos.length,
    reposActive: activeRepos.length,
    longLivedRepoCount,
    activeMonths,
    commitDays,
    longestStreakDays,
    ownPRs: raw.ownPRCount,
    externalPRs: raw.externalPRCount,
    externalReposContributed: raw.externalRepoCount,
    reviews: raw.reviewCount,
    starsGained: raw.starsGainedThisYear,
  };
}
