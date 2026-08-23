import type { DetailedYearData } from './types';
import { dominantLanguage } from '../metrics/language';

export interface ReportCardRow {
  year: number;
  language: string;
  reposActive: number;
  longLived: number;
  days: number;
  ownPRs: number;
  externalPRs: number;
  ownMerged: number;
  externalMerged: number;
  reviews: number;
  stars: number;
  reposCreated: number;
}

const NUMERIC_COLUMNS = [
  'reposActive',
  'longLived',
  'days',
  'ownPRs',
  'externalPRs',
  'ownMerged',
  'externalMerged',
  'reviews',
  'stars',
  'reposCreated',
] as const;

export function buildReportCard(years: DetailedYearData[]): { rows: ReportCardRow[]; highs: Set<string> } {
  const rows: ReportCardRow[] = years.map((y) => ({
    year: y.year,
    language: dominantLanguage(y.metrics) ?? '—',
    reposActive: y.metrics.reposActive,
    longLived: y.metrics.longLivedRepoCount,
    days: y.metrics.commitDays,
    ownPRs: y.metrics.ownPRs,
    externalPRs: y.metrics.externalPRs,
    ownMerged: y.ownMergedPRs.length,
    externalMerged: y.externalMergedPRs.length,
    reviews: y.metrics.reviews,
    stars: y.metrics.starsGained,
    reposCreated: y.metrics.reposCreated,
  }));

  const highs = new Set<string>();
  for (const column of NUMERIC_COLUMNS) {
    const max = Math.max(...rows.map((r) => r[column]));
    if (max <= 0) continue;
    for (const row of rows) {
      if (row[column] === max) highs.add(`${row.year}:${column}`);
    }
  }

  return { rows, highs };
}
