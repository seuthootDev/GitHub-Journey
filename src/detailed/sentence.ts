export interface CumulativeInput {
  commitDays: number;
  yearCount: number;
  ownPRs: number;
  externalPRs: number;
  ownMerged: number;
  externalMerged: number;
  starsGained: number;
  reposCreated: number;
  longLivedRepoCount: number;
}

export function renderCumulativeSentence(input: CumulativeInput): string[] {
  const opened = input.ownPRs + input.externalPRs;
  const merged = input.ownMerged + input.externalMerged;

  const first = `You showed up ${input.commitDays} days in ${input.yearCount} years.`;

  let second: string;
  if (input.externalMerged > 0) {
    second = `${opened} pull requests opened, ${merged} merged — ${input.externalMerged} in someone else's repo.`;
  } else if (input.ownMerged > 0) {
    second = `${merged} of ${opened} pull requests merged, all in your own repos.`;
  } else if (opened > 0) {
    second = `${opened} pull requests opened. None merged in this window.`;
  } else if (input.starsGained > 0) {
    second = `${input.starsGained} stars landed on your repos.`;
  } else {
    second = `${input.reposCreated} public repos. ${input.longLivedRepoCount} lived past a year.`;
  }

  return [first, second];
}
