import { describe, it, expect, vi } from 'vitest';
import { buildJourney } from './cli';

function makeOctokit() {
  return {
    rest: {
      users: { getByUsername: vi.fn().mockResolvedValue({ data: { created_at: '2024-01-01T00:00:00Z' } }) },
      repos: {
        listForUser: vi.fn().mockResolvedValue({
          data: [{ name: 'proj', created_at: '2024-01-01T00:00:00Z', pushed_at: '2024-06-01T00:00:00Z' }],
        }),
        listLanguages: vi.fn().mockResolvedValue({ data: { Python: 100 } }),
      },
      search: {
        issuesAndPullRequests: vi.fn().mockResolvedValue({ data: { total_count: 0, items: [] } }),
      },
      activity: { listStargazersForRepo: vi.fn().mockResolvedValue({ data: [] }) },
    },
    graphql: vi.fn().mockResolvedValue({
      user: { contributionsCollection: { contributionCalendar: { weeks: [] } } },
    }),
  };
}

describe('buildJourney', () => {
  it('produces 3 year lines plus a summary for an older account capped at 3 years', async () => {
    const octokit = makeOctokit();
    octokit.rest.users.getByUsername = vi
      .fn()
      .mockResolvedValue({ data: { created_at: '2022-01-01T00:00:00Z' } });
    const result = await buildJourney(octokit as any, {
      username: 'seuthootDev',
      displayName: 'Jung Seunghoon',
      maxYears: 3,
      now: new Date('2026-08-22T00:00:00Z'),
    });
    expect(result.pinHeadline.split('\n')).toHaveLength(4);
  });

  it('produces fewer year lines for a younger account, plus a summary when there are 2+ years', async () => {
    const octokit = makeOctokit();
    octokit.rest.users.getByUsername = vi
      .fn()
      .mockResolvedValue({ data: { created_at: '2025-01-01T00:00:00Z' } });
    const result = await buildJourney(octokit as any, {
      username: 'seuthootDev',
      displayName: 'Jung Seunghoon',
      maxYears: 3,
      now: new Date('2026-08-22T00:00:00Z'),
    });
    // 2025, 2026 + first → last summary
    expect(result.pinHeadline.split('\n')).toHaveLength(3);
  });

  it('marks the current (now) year as current on the last year line, not the summary', async () => {
    const octokit = makeOctokit();
    const result = await buildJourney(octokit as any, {
      username: 'seuthootDev',
      displayName: 'Jung Seunghoon',
      maxYears: 3,
      now: new Date('2026-08-22T00:00:00Z'),
    });
    const lines = result.pinHeadline.split('\n');
    expect(lines[2]).toContain('2026');
    expect(lines[2]).toContain('●');
    expect(lines[3]).not.toContain('●');
  });

  it('includes the pin headline inside the gist body', async () => {
    const octokit = makeOctokit();
    const result = await buildJourney(octokit as any, {
      username: 'seuthootDev',
      displayName: 'Jung Seunghoon',
      maxYears: 3,
      now: new Date('2026-08-22T00:00:00Z'),
    });
    expect(result.gistBody).toContain(result.pinHeadline);
  });

  it('includes a non-empty detailedSvg in the result, without changing pinHeadline', async () => {
    const octokit = makeOctokit();
    const before = await buildJourney(octokit as any, {
      username: 'seuthootDev',
      displayName: 'seuthootDev',
      maxYears: 1,
      now: new Date('2024-06-01'),
    });
    const result = await buildJourney(octokit as any, {
      username: 'seuthootDev',
      displayName: 'seuthootDev',
      maxYears: 1,
      now: new Date('2024-06-01'),
    });
    expect(result.detailedSvg).toContain('<svg');
    expect(result.pinHeadline).toBe(before.pinHeadline);
  });

  it('appends the comfort layer markdown after the pin lines in gistBody', async () => {
    const octokit = makeOctokit();
    const result = await buildJourney(octokit as any, {
      username: 'seuthootDev',
      displayName: 'seuthootDev',
      maxYears: 1,
      now: new Date('2024-06-01'),
    });
    const pinIndex = result.gistBody.indexOf(result.pinHeadline);
    expect(pinIndex).toBeGreaterThanOrEqual(0);
    // fixture has a repo pushed in 2024, so a hero moment exists and 'More moments:'
    // should not appear (fewer than 2 distinct moment candidates in this fixture) —
    // assert the comfort layer's cumulative sentence lands strictly after the pin instead.
    const comfortIndex = result.gistBody.indexOf('You showed up');
    expect(comfortIndex).toBeGreaterThan(pinIndex);
  });
});
