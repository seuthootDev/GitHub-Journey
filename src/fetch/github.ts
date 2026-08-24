import type { RawYearData } from './types';

export interface OctokitLike {
  rest: {
    users: { getByUsername(params: { username: string }): Promise<{ data: { created_at: string } }> };
    repos: {
      listForUser(params: {
        username: string;
        per_page: number;
      }): Promise<{ data: Array<{ name: string; created_at: string; pushed_at: string; fork: boolean }> }>;
      listLanguages(params: { owner: string; repo: string }): Promise<{ data: Record<string, number> }>;
    };
    search: {
      issuesAndPullRequests(params: {
        q: string;
        per_page?: number;
      }): Promise<{
        data: {
          total_count: number;
          items?: Array<{
            repository_url: string;
            created_at: string;
            pull_request?: { merged_at: string | null };
          }>;
        };
      }>;
    };
    activity: {
      listStargazersForRepo(params: {
        owner: string;
        repo: string;
        headers: Record<string, string>;
        per_page: number;
      }): Promise<{ data: Array<{ starred_at?: string }> }>;
    };
  };
  graphql(query: string, variables: Record<string, unknown>): Promise<any>;
}

export async function fetchAccountCreatedYear(octokit: OctokitLike, username: string): Promise<number> {
  const { data } = await octokit.rest.users.getByUsername({ username });
  return new Date(data.created_at).getUTCFullYear();
}

function isNotFound(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { status?: unknown }).status === 404;
}

function repoNameFromUrl(repositoryUrl: string): string {
  return repositoryUrl.replace('https://api.github.com/repos/', '');
}

function mergedEvents(items: Array<{ repository_url: string; pull_request?: { merged_at: string | null } }> = []) {
  return items
    .filter((item): item is typeof item & { pull_request: { merged_at: string } } =>
      Boolean(item.pull_request?.merged_at)
    )
    .map((item) => ({ repo: repoNameFromUrl(item.repository_url), date: item.pull_request.merged_at }));
}

const CONTRIBUTIONS_QUERY = `
  query($username: String!, $from: DateTime!, $to: DateTime!) {
    user(login: $username) {
      contributionsCollection(from: $from, to: $to) {
        contributionCalendar {
          weeks { contributionDays { date contributionCount } }
        }
        commitContributionsByRepository(maxRepositories: 100) {
          repository { name isFork }
        }
      }
    }
  }
`;

export async function fetchRawYear(octokit: OctokitLike, username: string, year: number): Promise<RawYearData> {
  const { data: allRepos } = await octokit.rest.repos.listForUser({ username, per_page: 100 });
  const repoList = allRepos.filter((r) => !r.fork);

  const repos = await Promise.all(
    repoList.map(async (repo) => {
      let languages: Record<string, number>;
      try {
        ({ data: languages } = await octokit.rest.repos.listLanguages({ owner: username, repo: repo.name }));
      } catch (err) {
        if (!isNotFound(err)) throw err;
        languages = {};
      }
      return { name: repo.name, createdAt: repo.created_at, pushedAt: repo.pushed_at, languages };
    })
  );

  const from = `${year}-01-01T00:00:00Z`;
  const to = `${year}-12-31T23:59:59Z`;
  const dateRange = `${year}-01-01..${year}-12-31`;

  const contributions = await octokit.graphql(CONTRIBUTIONS_QUERY, { username, from, to });
  const collection = contributions.user.contributionsCollection;
  const contributionCalendar = collection.contributionCalendar;
  const commitContributionsByRepository: Array<{ repository: { name: string; isFork: boolean } }> =
    collection.commitContributionsByRepository ?? [];
  const activeRepoNames = commitContributionsByRepository
    .filter((c) => !c.repository.isFork)
    .map((c) => c.repository.name);

  const { data: ownPRs } = await octokit.rest.search.issuesAndPullRequests({
    q: `author:${username} type:pr created:${dateRange} user:${username}`,
    per_page: 100,
  });
  const { data: externalPRs } = await octokit.rest.search.issuesAndPullRequests({
    q: `author:${username} type:pr created:${dateRange} -user:${username}`,
    per_page: 100,
  });
  const { data: reviews } = await octokit.rest.search.issuesAndPullRequests({
    q: `reviewed-by:${username} type:pr created:${dateRange}`,
    per_page: 100,
  });
  const { data: issues } = await octokit.rest.search.issuesAndPullRequests({
    q: `is:issue author:${username} created:${dateRange}`,
    per_page: 100,
  });
  const { data: ownMerged } = await octokit.rest.search.issuesAndPullRequests({
    q: `author:${username} type:pr is:merged merged:${dateRange} user:${username}`,
    per_page: 100,
  });
  const { data: externalMerged } = await octokit.rest.search.issuesAndPullRequests({
    q: `author:${username} type:pr is:merged merged:${dateRange} -user:${username}`,
    per_page: 100,
  });
  const externalRepoNames = new Set((externalPRs.items ?? []).map((item) => item.repository_url));

  let starsGainedThisYear = 0;
  const starEvents: Array<{ repo: string; starredAt: string }> = [];
  for (const repo of repoList) {
    let stargazers: Array<{ starred_at?: string }>;
    try {
      ({ data: stargazers } = await octokit.rest.activity.listStargazersForRepo({
        owner: username,
        repo: repo.name,
        headers: { accept: 'application/vnd.github.star+json' },
        per_page: 100,
      }));
    } catch (err) {
      if (!isNotFound(err)) throw err;
      stargazers = [];
    }
    for (const s of stargazers) {
      if (s.starred_at && new Date(s.starred_at).getUTCFullYear() === year) {
        starsGainedThisYear++;
        starEvents.push({ repo: repo.name, starredAt: s.starred_at });
      }
    }
  }

  return {
    year,
    repos,
    activeRepoNames,
    contributionCalendar,
    ownPRCount: ownPRs.total_count,
    externalPRCount: externalPRs.total_count,
    externalRepoCount: externalRepoNames.size,
    reviewCount: reviews.total_count,
    starsGainedThisYear,
    ownMergedPRs: mergedEvents(ownMerged.items),
    externalMergedPRs: mergedEvents(externalMerged.items),
    ownMergedCount: ownMerged.total_count,
    externalMergedCount: externalMerged.total_count,
    ownPROpenedEvents: (ownPRs.items ?? []).map((item) => ({ repo: repoNameFromUrl(item.repository_url), date: item.created_at })),
    externalPROpenedEvents: (externalPRs.items ?? []).map((item) => ({ repo: repoNameFromUrl(item.repository_url), date: item.created_at })),
    starEvents,
    reviewEvents: (reviews.items ?? []).map((item) => ({ repo: repoNameFromUrl(item.repository_url), date: item.created_at })),
    issueEvents: (issues.items ?? []).map((item) => ({ repo: repoNameFromUrl(item.repository_url), date: item.created_at })),
  };
}
