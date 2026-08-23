import type { Archetype } from '../types';
import type { DetailedYearData } from './types';
import { renderCumulativeSentence } from './sentence';
import { dominantLanguage } from '../metrics/language';

export interface YearNote {
  heading: string;
  lines: [string, string];
}

export function buildYearNote(year: DetailedYearData, archetype: Archetype): YearNote {
  const lang = dominantLanguage(year.metrics);
  const first =
    year.metrics.reposCreated > 0
      ? `${lang ? `${lang} was the main language. ` : ''}${year.metrics.reposCreated} repo${
          year.metrics.reposCreated === 1 ? '' : 's'
        } created, ${year.metrics.longLivedRepoCount} still active a year later.`
      : `No new repos this year — ${year.metrics.commitDays} commit day${year.metrics.commitDays === 1 ? '' : 's'} on what was already there.`;

  const [, second] = renderCumulativeSentence({
    commitDays: year.metrics.commitDays,
    yearCount: 1,
    ownPRs: year.metrics.ownPRs,
    externalPRs: year.metrics.externalPRs,
    ownMerged: year.ownMergedPRs.length,
    externalMerged: year.externalMergedPRs.length,
    starsGained: year.metrics.starsGained,
    reposCreated: year.metrics.reposCreated,
    longLivedRepoCount: year.metrics.longLivedRepoCount,
  });

  return {
    heading: `${year.year} ${archetype}`,
    lines: [first, second],
  };
}
