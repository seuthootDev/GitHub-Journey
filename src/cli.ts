import { fileURLToPath } from 'node:url';
import { Octokit } from '@octokit/rest';
import { fetchAccountCreatedYear, fetchRawYear, type OctokitLike } from './fetch/github';
import { toYearlyMetrics } from './metrics';
import { buildYearContexts } from './diff';
import { evaluateYear } from './rules';
import { renderPinHeadline, renderGistBody } from './render';
import { updateGist, type GistOctokitLike } from './gist';
import type { YearlyMetrics } from './types';
import { toDetailedYearData, windowTotals } from './detailed';
import { renderDetailedSvg } from './render/detailed';
import { renderComfortLayerMarkdown } from './render/detailedMarkdown';
import { selectHero, selectMoreMoments } from './detailed/moments';
import { renderCumulativeSentence } from './detailed/sentence';
import { summarizeJourney } from './summarize';
import type { DetailedYearData } from './detailed/types';

export interface JourneyResult {
  pinHeadline: string;
  gistBody: string;
  detailedSvg: string;
}

/**
 * Builds the two gist file contents from a JourneyResult, wiring the SVG into journey.md
 * via an image reference so the gist body links to the full journey (spec §10.1/§10.2/§11).
 */
export function buildGistFiles(
  username: string,
  gistId: string,
  result: JourneyResult
): { 'journey.md': string; 'journey.svg': string } {
  const svgImageMarkdown = `\n![full journey](https://gist.githubusercontent.com/${username}/${gistId}/raw/journey.svg)\n`;
  return {
    'journey.md': result.gistBody + svgImageMarkdown,
    'journey.svg': result.detailedSvg,
  };
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
  const detailedYears: DetailedYearData[] = [];
  for (const year of years) {
    const raw = await fetchRawYear(octokit, opts.username, year);
    const metrics = toYearlyMetrics(raw, priorLanguages);
    Object.keys(metrics.languageBytes).forEach((lang) => priorLanguages.add(lang));
    yearlyMetrics.push(metrics);
    detailedYears.push(toDetailedYearData(raw, metrics));
  }

  const contexts = buildYearContexts(yearlyMetrics);
  const journeyYears = contexts.map(evaluateYear);

  const arcLine = summarizeJourney(journeyYears) || journeyYears.map((y) => y.archetype).join(' → ');
  const detailedSvg = renderDetailedSvg(opts.username, arcLine, detailedYears, journeyYears);

  const hero = selectHero(detailedYears);
  const moments = selectMoreMoments(detailedYears, hero);
  const totals = windowTotals(detailedYears);
  const cumulativeLines = renderCumulativeSentence({ ...totals, yearCount: detailedYears.length });
  const comfortLayerMarkdown = renderComfortLayerMarkdown(hero, moments, cumulativeLines);

  return {
    pinHeadline: renderPinHeadline(journeyYears),
    gistBody: renderGistBody(opts.username, opts.displayName, journeyYears, yearlyMetrics) + comfortLayerMarkdown,
    detailedSvg,
  };
}

async function main() {
  const usernameFlag = process.argv.find((a) => a.startsWith('--username='));
  const nameFlag = process.argv.find((a) => a.startsWith('--name='));
  const username = usernameFlag?.slice('--username='.length);
  const displayName = nameFlag?.slice('--name='.length) || username;
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
    maxYears: 3,
  });

  if (gistId && token) {
    const files = buildGistFiles(username, gistId, result);
    await updateGist(octokit as unknown as GistOctokitLike, gistId, 'journey.md', files['journey.md']);
    await updateGist(octokit as unknown as GistOctokitLike, gistId, 'journey.svg', files['journey.svg']);
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
