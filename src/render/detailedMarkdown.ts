import type { HeroMoment, Moment } from '../detailed/moments';

export function renderComfortLayerMarkdown(hero: HeroMoment | null, moments: Moment[], cumulativeLines: string[]): string {
  const lines: string[] = ['', '---', ''];
  if (hero) {
    lines.push(`**${hero.date}** — ${hero.name} · first public repo, the start.`, '');
  }
  lines.push(...cumulativeLines, '');

  if (moments.length > 0) {
    lines.push('More moments:', '');
    for (const m of moments) {
      lines.push(`- **${m.date}** — ${m.name} · ${m.why}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}
