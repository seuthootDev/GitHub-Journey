import type { JourneyYear, Reason, YearlyMetrics } from '../types';
import { dominantLanguage } from '../metrics/language';

function renderReason(reason: Reason): string {
  return reason.kind === 'language' ? `${reason.emoji} ${reason.label}` : `${reason.icon} ${reason.text}`;
}

function renderLine(year: JourneyYear): string {
  const marker = year.isCurrent ? ' ●' : '';
  return `${year.year}${marker} ${year.archetype} · ${renderReason(year.reason)}`;
}

export function renderPinHeadline(years: JourneyYear[]): string {
  return years.map(renderLine).join('\n');
}

function renderBreakdownTable(metrics: YearlyMetrics[]): string {
  const header = '| Year | Top Language | Active Repos | Long-lived | Commit Days | Longest Streak | Own PRs | Ext PRs | Reviews | Stars |';
  const divider = '|---|---|---|---|---|---|---|---|---|---|';
  const rows = metrics.map((m) => {
    const lang = dominantLanguage(m) ?? '—';
    return `| ${m.year} | ${lang} | ${m.reposActive} | ${m.longLivedRepoCount} | ${m.commitDays} | ${m.longestStreakDays}d | ${m.ownPRs} | ${m.externalPRs} | ${m.reviews} | ${m.starsGained} |`;
  });
  return [header, divider, ...rows].join('\n');
}

export function renderGistBody(
  username: string,
  displayName: string,
  years: JourneyYear[],
  metrics: YearlyMetrics[]
): string {
  const headline = renderPinHeadline(years);
  const first = years[0];
  const last = years[years.length - 1];
  const synthesis =
    first && last
      ? `Your Developer Journey: you started as ${first.archetype} in ${first.year}, and by ${last.year} you were ${last.archetype}.`
      : '';
  return [
    `# ${displayName} (@${username})`,
    '',
    headline,
    '',
    '---',
    '',
    '## Year-by-year breakdown',
    '',
    renderBreakdownTable(metrics),
    '',
    '---',
    '',
    synthesis,
    '',
  ].join('\n');
}
