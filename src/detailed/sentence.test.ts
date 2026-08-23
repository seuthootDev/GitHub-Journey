import { describe, it, expect } from 'vitest';
import { renderCumulativeSentence } from './sentence';

describe('renderCumulativeSentence', () => {
  it('produces the quiet-only two-line example from the spec', () => {
    const lines = renderCumulativeSentence({
      commitDays: 47,
      yearCount: 3,
      ownPRs: 0,
      externalPRs: 0,
      ownMerged: 0,
      externalMerged: 0,
      starsGained: 0,
      reposCreated: 4,
      longLivedRepoCount: 1,
    });
    expect(lines).toEqual(['You showed up 47 days in 3 years.', '4 public repos. 1 lived past a year.']);
  });

  it('produces the PR-without-stars example from the spec', () => {
    const lines = renderCumulativeSentence({
      commitDays: 101,
      yearCount: 3,
      ownPRs: 24,
      externalPRs: 0,
      ownMerged: 24,
      externalMerged: 0,
      starsGained: 0,
      reposCreated: 13,
      longLivedRepoCount: 2,
    });
    expect(lines).toEqual([
      'You showed up 101 days in 3 years.',
      '24 of 24 pull requests merged, all in your own repos.',
    ]);
  });

  it('produces the demo (external merges) example from the spec', () => {
    const lines = renderCumulativeSentence({
      commitDays: 241,
      yearCount: 3,
      ownPRs: 87,
      externalPRs: 37,
      ownMerged: 83,
      externalMerged: 23,
      starsGained: 5,
      reposCreated: 21,
      longLivedRepoCount: 2,
    });
    expect(lines).toEqual([
      'You showed up 241 days in 3 years.',
      "124 pull requests opened, 106 merged — 23 in someone else's repo.",
    ]);
  });

  it('never mentions pull requests or stars for a 0-PR, 0-star account', () => {
    const lines = renderCumulativeSentence({
      commitDays: 10,
      yearCount: 1,
      ownPRs: 0,
      externalPRs: 0,
      ownMerged: 0,
      externalMerged: 0,
      starsGained: 0,
      reposCreated: 1,
      longLivedRepoCount: 0,
    });
    expect(lines.join(' ')).not.toMatch(/pull request|star/i);
  });
});
