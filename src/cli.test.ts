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
  it('produces a 5-line pin headline for an account exactly 5 years old', async () => {
    const octokit = makeOctokit();
    octokit.rest.users.getByUsername = vi
      .fn()
      .mockResolvedValue({ data: { created_at: '2022-01-01T00:00:00Z' } });
    const result = await buildJourney(octokit as any, {
      username: 'seuthootDev',
      displayName: 'Jung Seunghoon',
      maxYears: 5,
      now: new Date('2026-08-22T00:00:00Z'),
    });
    expect(result.pinHeadline.split('\n')).toHaveLength(5);
  });

  it('produces fewer lines for a younger account, capped at maxYears', async () => {
    const octokit = makeOctokit(); // created_at 2024-01-01
    const result = await buildJourney(octokit as any, {
      username: 'seuthootDev',
      displayName: 'Jung Seunghoon',
      maxYears: 5,
      now: new Date('2026-08-22T00:00:00Z'),
    });
    expect(result.pinHeadline.split('\n')).toHaveLength(3); // 2024, 2025, 2026
  });

  it('marks the current (now) year as current in the last line', async () => {
    const octokit = makeOctokit();
    const result = await buildJourney(octokit as any, {
      username: 'seuthootDev',
      displayName: 'Jung Seunghoon',
      maxYears: 5,
      now: new Date('2026-08-22T00:00:00Z'),
    });
    const lines = result.pinHeadline.split('\n');
    expect(lines[lines.length - 1]).toContain('2026');
    expect(lines[lines.length - 1]).toContain('●');
  });

  it('includes the pin headline inside the gist body', async () => {
    const octokit = makeOctokit();
    const result = await buildJourney(octokit as any, {
      username: 'seuthootDev',
      displayName: 'Jung Seunghoon',
      maxYears: 5,
      now: new Date('2026-08-22T00:00:00Z'),
    });
    expect(result.gistBody).toContain(result.pinHeadline);
  });
});
