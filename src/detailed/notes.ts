import type { Archetype } from '../types';
import type { DetailedYearData } from './types';
import { renderCumulativeSentence } from './sentence';
import { dominantLanguage } from '../metrics/language';

export interface YearNote {
  heading: string;
  lines: [string, string];
}

function yearOf(iso: string): number {
  return new Date(iso).getUTCFullYear();
}

function namedRepoClause(names: string[]): string {
  if (names.length === 0) return '';
  if (names.length === 1) return ` (${names[0]})`;
  if (names.length === 2) return ` (${names[0]} and ${names[1]})`;
  return ` (${names[0]}, ${names[1]}, and ${names.length - 2} more)`;
}

export function buildYearNote(year: DetailedYearData, archetype: Archetype): YearNote {
  const lang = dominantLanguage(year.metrics);

  const externalRepoNames = [...new Set(year.externalMergedPRs.map((e) => e.repo))];
  const createdRepoNames = year.repos
    .filter((r) => yearOf(r.createdAt) === year.year)
    .map((r) => r.name);

  let first: string;
  if (externalRepoNames.length > 0) {
    first = `External PRs landed${namedRepoClause(externalRepoNames)} this year.`;
  } else if (year.metrics.reposCreated > 0) {
    first = `${lang ? `${lang} was the main language. ` : ''}${year.metrics.reposCreated} repo${
      year.metrics.reposCreated === 1 ? '' : 's'
    } created${namedRepoClause(createdRepoNames)}, ${year.metrics.longLivedRepoCount} still active a year later.`;
  } else {
    first = `No new repos this year — ${year.metrics.commitDays} commit day${year.metrics.commitDays === 1 ? '' : 's'} on what was already there.`;
  }

  const [, second] = renderCumulativeSentence({
    commitDays: year.metrics.commitDays,
    yearCount: 1,
    ownPRs: year.metrics.ownPRs,
    externalPRs: year.metrics.externalPRs,
    ownMerged: year.ownMergedCount,
    externalMerged: year.externalMergedCount,
    starsGained: year.metrics.starsGained,
    reposCreated: year.metrics.reposCreated,
    longLivedRepoCount: year.metrics.longLivedRepoCount,
  });

  return {
    heading: `${year.year} ${archetype}`,
    lines: [first, second],
  };
}
