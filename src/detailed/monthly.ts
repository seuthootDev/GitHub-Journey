import type { DetailedYearData } from './types';

export function monthLabels(years: DetailedYearData[]): string[] {
  const labels: string[] = [];
  for (const y of years) {
    for (let m = 1; m <= 12; m++) {
      labels.push(`${y.year}-${String(m).padStart(2, '0')}`);
    }
  }
  return labels;
}

function monthIndex(years: DetailedYearData[], isoDate: string): number {
  const d = new Date(isoDate);
  const year = d.getUTCFullYear();
  const month = d.getUTCMonth(); // 0-indexed
  const yearIndex = years.findIndex((y) => y.year === year);
  if (yearIndex === -1) return -1;
  return yearIndex * 12 + month;
}

export function bucketByMonth(years: DetailedYearData[], pick: (y: DetailedYearData) => string[]): number[] {
  const counts = new Array(years.length * 12).fill(0);
  for (const y of years) {
    for (const date of pick(y)) {
      const idx = monthIndex(years, date);
      if (idx >= 0) counts[idx]++;
    }
  }
  return counts;
}

export function bucketCumulativeByMonth(
  years: DetailedYearData[],
  pick: (y: DetailedYearData) => string[]
): number[] {
  const perMonth = bucketByMonth(years, pick);
  const cumulative: number[] = [];
  let running = 0;
  for (const count of perMonth) {
    running += count;
    cumulative.push(running);
  }
  return cumulative;
}
