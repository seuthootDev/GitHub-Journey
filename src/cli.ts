import { fileURLToPath } from 'node:url';
import { Octokit } from '@octokit/rest';
import { fetchAccountCreatedYear, fetchRawYear, type OctokitLike } from './fetch/github';
import { toYearlyMetrics } from './metrics';
import { buildYearContexts } from './diff';
import { evaluateYear } from './rules';
import { renderPinHeadline, renderGistBody } from './render';
import { updateGist, type GistOctokitLike } from './gist';
import type { YearlyMetrics } from './types';

export interface JourneyResult {
  pinHeadline: string;
  gistBody: string;
}

export async function buildJourney(
  octokit: OctokitLike,
  opts: { username: string; displayName: string; maxYears: number; now?: Date }
): Promise<JourneyResult> {
  const now = opts.now ?? new Date();
  const currentYear = now.getUTCFullYear();
  const createdYear = await fetchAccountCreatedYear(octokit, opts.username);
  const firstYear = Math.max(createdYear, currentYear - opts.maxYears + 1);

  const years: number[] = [];
  for (let y = firstYear; y <= currentYear; y++) years.push(y);

  const priorLanguages = new Set<string>();
  const yearlyMetrics: YearlyMetrics[] = [];
  for (const year of years) {
    const raw = await fetchRawYear(octokit, opts.username, year);
    const metrics = toYearlyMetrics(raw, priorLanguages);
    Object.keys(metrics.languageBytes).forEach((lang) => priorLanguages.add(lang));
    yearlyMetrics.push(metrics);
  }

  const contexts = buildYearContexts(yearlyMetrics);
  const journeyYears = contexts.map(evaluateYear);

  return {
    pinHeadline: renderPinHeadline(journeyYears),
    gistBody: renderGistBody(opts.username, opts.displayName, journeyYears, yearlyMetrics),
  };
}

async function main() {
  const username = process.argv.find((a) => a.startsWith('--username='))?.split('=')[1] ?? process.env.USERNAME;
  const displayName = process.argv.find((a) => a.startsWith('--name='))?.split('=')[1] ?? username;
  const token = process.env.GH_TOKEN;
  const gistId = process.env.GIST_ID;

  if (!username) {
    console.error('Usage: github-journey --username=<login> [--name="Display Name"]');
    process.exit(1);
  }

  const octokit = new Octokit({ auth: token });
  const result = await buildJourney(octokit as unknown as OctokitLike, {
    username,
    displayName: displayName ?? username,
    maxYears: 5,
  });

  if (gistId && token) {
    await updateGist(octokit as unknown as GistOctokitLike, gistId, 'journey.md', result.gistBody);
    console.log(`Updated gist ${gistId}`);
  } else {
    console.log(result.gistBody);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
