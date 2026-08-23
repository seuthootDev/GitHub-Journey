import { describe, it, expect, vi } from 'vitest';
import { fetchAccountCreatedYear, fetchRawYear } from './github';

function makeOctokit(overrides: Record<string, any> = {}) {
  return {
    rest: {
      users: { getByUsername: vi.fn().mockResolvedValue({ data: { created_at: '2020-05-01T00:00:00Z' } }) },
      repos: {
        listForUser: vi.fn().mockResolvedValue({
          data: [{ name: 'proj-a', created_at: '2024-01-01T00:00:00Z', pushed_at: '2024-06-01T00:00:00Z', fork: false }],
        }),
        listLanguages: vi.fn().mockResolvedValue({ data: { Python: 500 } }),
      },
      search: {
        issuesAndPullRequests: vi.fn().mockResolvedValue({ data: { total_count: 4 } }),
      },
      activity: {
        listStargazersForRepo: vi.fn().mockResolvedValue({ data: [{ starred_at: '2024-03-01T00:00:00Z' }] }),
      },
    },
    graphql: vi.fn().mockResolvedValue({
      user: {
        contributionsCollection: {
          contributionCalendar: { weeks: [{ contributionDays: [{ date: '2024-01-05', contributionCount: 3 }] }] },
          commitContributionsByRepository: [{ repository: { name: 'proj-a', isFork: false } }],
        },
      },
    }),
    ...overrides,
  };
}

describe('fetchAccountCreatedYear', () => {
  it('reads the account creation year from the users API', async () => {
    const octokit = makeOctokit();
    await expect(fetchAccountCreatedYear(octokit as any, 'seuthootDev')).resolves.toBe(2020);
    expect(octokit.rest.users.getByUsername).toHaveBeenCalledWith({ username: 'seuthootDev' });
  });
});

describe('fetchRawYear', () => {
  it('assembles repos with their languages', async () => {
    const octokit = makeOctokit();
    const result = await fetchRawYear(octokit as any, 'seuthootDev', 2024);
    expect(result.repos).toEqual([
      { name: 'proj-a', createdAt: '2024-01-01T00:00:00Z', pushedAt: '2024-06-01T00:00:00Z', languages: { Python: 500 } },
    ]);
  });

  it('carries the requested year and contribution calendar through', async () => {
    const octokit = makeOctokit();
    const result = await fetchRawYear(octokit as any, 'seuthootDev', 2024);
    expect(result.year).toBe(2024);
    expect(result.contributionCalendar.weeks[0].contributionDays[0].contributionCount).toBe(3);
  });

  it('derives activeRepoNames from commitContributionsByRepository', async () => {
    const octokit = makeOctokit();
    const result = await fetchRawYear(octokit as any, 'seuthootDev', 2024);
    expect(result.activeRepoNames).toEqual(['proj-a']);
  });

  it('excludes forked repos from both the repo list and activeRepoNames', async () => {
    const octokit = makeOctokit({
      rest: {
        ...makeOctokit().rest,
        repos: {
          ...makeOctokit().rest.repos,
          listForUser: vi.fn().mockResolvedValue({
            data: [
              { name: 'proj-a', created_at: '2024-01-01T00:00:00Z', pushed_at: '2024-06-01T00:00:00Z', fork: false },
              { name: 'forked-proj', created_at: '2024-02-01T00:00:00Z', pushed_at: '2024-02-01T00:00:00Z', fork: true },
            ],
          }),
        },
      },
      graphql: vi.fn().mockResolvedValue({
        user: {
          contributionsCollection: {
            contributionCalendar: { weeks: [] },
            commitContributionsByRepository: [
              { repository: { name: 'proj-a', isFork: false } },
              { repository: { name: 'forked-proj', isFork: true } },
            ],
          },
        },
      }),
    });
    const result = await fetchRawYear(octokit as any, 'seuthootDev', 2024);
    expect(result.repos.map((r) => r.name)).toEqual(['proj-a']);
    expect(result.activeRepoNames).toEqual(['proj-a']);
  });

  it('queries own and external PR counts with year-scoped search queries', async () => {
    const octokit = makeOctokit();
    await fetchRawYear(octokit as any, 'seuthootDev', 2024);
    const calls = octokit.rest.search.issuesAndPullRequests.mock.calls.map((c: any[]) => c[0].q);
    expect(calls).toContain('author:seuthootDev type:pr created:2024-01-01..2024-12-31 user:seuthootDev');
    expect(calls).toContain('author:seuthootDev type:pr created:2024-01-01..2024-12-31 -user:seuthootDev');
    expect(calls).toContain('reviewed-by:seuthootDev type:pr created:2024-01-01..2024-12-31');
  });

  it('counts stars gained in the target year from stargazer timestamps', async () => {
    const octokit = makeOctokit();
    const result = await fetchRawYear(octokit as any, 'seuthootDev', 2024);
    expect(result.starsGainedThisYear).toBe(1);
  });

  it('treats a 404 from listLanguages as an empty language set for that repo, not a fatal error', async () => {
    const octokit = makeOctokit({
      rest: {
        ...makeOctokit().rest,
        repos: {
          ...makeOctokit().rest.repos,
          listLanguages: vi.fn().mockRejectedValue(Object.assign(new Error('Not Found'), { status: 404 })),
        },
      },
    });
    const result = await fetchRawYear(octokit as any, 'seuthootDev', 2024);
    expect(result.repos).toEqual([
      { name: 'proj-a', createdAt: '2024-01-01T00:00:00Z', pushedAt: '2024-06-01T00:00:00Z', languages: {} },
    ]);
  });

  it('treats a 404 from listStargazersForRepo (e.g. an archived repo) as zero stars for that repo, not a fatal error', async () => {
    const octokit = makeOctokit({
      rest: {
        ...makeOctokit().rest,
        activity: {
          listStargazersForRepo: vi.fn().mockRejectedValue(Object.assign(new Error('Not Found'), { status: 404 })),
        },
      },
    });
    const result = await fetchRawYear(octokit as any, 'seuthootDev', 2024);
    expect(result.starsGainedThisYear).toBe(0);
  });

  it('still throws for a non-404 error from listStargazersForRepo (e.g. rate limiting)', async () => {
    const octokit = makeOctokit({
      rest: {
        ...makeOctokit().rest,
        activity: {
          listStargazersForRepo: vi.fn().mockRejectedValue(Object.assign(new Error('Forbidden'), { status: 403 })),
        },
      },
    });
    await expect(fetchRawYear(octokit as any, 'seuthootDev', 2024)).rejects.toThrow('Forbidden');
  });

  it('counts distinct external repos from the external-PR search results', async () => {
    const octokit = makeOctokit({
      rest: {
        ...makeOctokit().rest,
        search: {
          issuesAndPullRequests: vi
            .fn()
            .mockResolvedValueOnce({ data: { total_count: 2, items: [] } }) // own PRs
            .mockResolvedValueOnce({
              data: {
                total_count: 2,
                items: [
                  { repository_url: 'https://api.github.com/repos/foo/bar', created_at: '2024-01-01T00:00:00Z' },
                  { repository_url: 'https://api.github.com/repos/foo/bar', created_at: '2024-01-02T00:00:00Z' },
                ],
              },
            }) // external PRs
            .mockResolvedValueOnce({ data: { total_count: 0, items: [] } }) // reviews
            .mockResolvedValueOnce({ data: { total_count: 0, items: [] } }) // ownMerged
            .mockResolvedValueOnce({ data: { total_count: 0, items: [] } }), // externalMerged
        },
      },
    });
    const result = await fetchRawYear(octokit as any, 'seuthootDev', 2024);
    expect(result.externalRepoCount).toBe(1);
  });

  it('captures merged own/external PR events with repo and merged date', async () => {
    const octokit = makeOctokit({
      rest: {
        ...makeOctokit().rest,
        search: {
          issuesAndPullRequests: vi.fn((params: { q: string }) => {
            if (params.q.includes('is:merged') && params.q.includes('-user:seuthootDev')) {
              return Promise.resolve({
                data: {
                  total_count: 1,
                  items: [
                    {
                      repository_url: 'https://api.github.com/repos/someone-else/Distributed_MES',
                      created_at: '2026-01-05T00:00:00Z',
                      pull_request: { merged_at: '2026-01-10T00:00:00Z' },
                    },
                  ],
                },
              });
            }
            if (params.q.includes('is:merged') && params.q.includes('user:seuthootDev')) {
              return Promise.resolve({
                data: {
                  total_count: 1,
                  items: [
                    {
                      repository_url: 'https://api.github.com/repos/seuthootDev/hanghae99-backend-week1',
                      created_at: '2025-07-01T00:00:00Z',
                      pull_request: { merged_at: '2025-07-03T00:00:00Z' },
                    },
                  ],
                },
              });
            }
            return Promise.resolve({ data: { total_count: 0, items: [] } });
          }),
        },
      },
    });

    const result = await fetchRawYear(octokit as any, 'seuthootDev', 2026);

    expect(result.ownMergedPRs).toEqual([
      { repo: 'seuthootDev/hanghae99-backend-week1', date: '2025-07-03T00:00:00Z' },
    ]);
    expect(result.externalMergedPRs).toEqual([
      { repo: 'someone-else/Distributed_MES', date: '2026-01-10T00:00:00Z' },
    ]);
  });

  it('captures star events (repo + starred_at) alongside the existing yearly count', async () => {
    const octokit = makeOctokit({
      rest: {
        ...makeOctokit().rest,
        repos: {
          ...makeOctokit().rest.repos,
          listForUser: vi
            .fn()
            .mockResolvedValue({
              data: [
                { name: 'qml-vtk-python-pyside6', created_at: '2025-01-01T00:00:00Z', pushed_at: '2025-06-01T00:00:00Z', fork: false },
              ],
            }),
        },
        activity: {
          listStargazersForRepo: vi
            .fn()
            .mockResolvedValue({ data: [{ starred_at: '2026-02-27T00:00:00Z' }] }),
        },
      },
    });

    const result = await fetchRawYear(octokit as any, 'seuthootDev', 2026);

    expect(result.starEvents).toEqual([
      { repo: 'qml-vtk-python-pyside6', starredAt: '2026-02-27T00:00:00Z' },
    ]);
  });

  it('records ownMergedCount/externalMergedCount from search total_count, even when items is a smaller (per_page-capped) sample', async () => {
    const octokit = makeOctokit({
      rest: {
        ...makeOctokit().rest,
        search: {
          issuesAndPullRequests: vi.fn((params: { q: string }) => {
            if (params.q.includes('is:merged') && params.q.includes('-user:seuthootDev')) {
              return Promise.resolve({
                data: {
                  total_count: 40,
                  items: [
                    {
                      repository_url: 'https://api.github.com/repos/someone-else/repo',
                      created_at: '2026-01-05T00:00:00Z',
                      pull_request: { merged_at: '2026-01-10T00:00:00Z' },
                    },
                  ],
                },
              });
            }
            if (params.q.includes('is:merged') && params.q.includes('user:seuthootDev')) {
              return Promise.resolve({
                data: {
                  total_count: 150,
                  items: [
                    {
                      repository_url: 'https://api.github.com/repos/seuthootDev/repo',
                      created_at: '2026-01-01T00:00:00Z',
                      pull_request: { merged_at: '2026-01-02T00:00:00Z' },
                    },
                  ],
                },
              });
            }
            return Promise.resolve({ data: { total_count: 0, items: [] } });
          }),
        },
      },
    });

    const result = await fetchRawYear(octokit as any, 'seuthootDev', 2026);

    expect(result.ownMergedCount).toBe(150);
    expect(result.externalMergedCount).toBe(40);
    // The event arrays stay whatever sample the API returned — they are not the total.
    expect(result.ownMergedPRs).toHaveLength(1);
    expect(result.externalMergedPRs).toHaveLength(1);
  });

  it('captures ownPROpenedEvents with repo and creation date', async () => {
    const octokit = makeOctokit({
      rest: {
        ...makeOctokit().rest,
        search: {
          issuesAndPullRequests: vi
            .fn()
            .mockResolvedValueOnce({
              data: {
                total_count: 1,
                items: [
                  {
                    repository_url: 'https://api.github.com/repos/seuthootDev/proj-a',
                    created_at: '2024-01-15T00:00:00Z',
                  },
                ],
              },
            }) // own PRs
            .mockResolvedValueOnce({ data: { total_count: 0, items: [] } }) // external PRs
            .mockResolvedValueOnce({ data: { total_count: 0, items: [] } }) // reviews
            .mockResolvedValueOnce({ data: { total_count: 0, items: [] } }) // ownMerged
            .mockResolvedValueOnce({ data: { total_count: 0, items: [] } }), // externalMerged
        },
      },
    });

    const result = await fetchRawYear(octokit as any, 'seuthootDev', 2024);

    expect(result.ownPROpenedEvents).toEqual([
      { repo: 'seuthootDev/proj-a', date: '2024-01-15T00:00:00Z' },
    ]);
  });
});
