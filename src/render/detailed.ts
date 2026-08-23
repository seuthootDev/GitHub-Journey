import { chartGridSlots, buildPolylinePoints, buildBars, type PlotArea } from './chart';
import { bucketByMonth, bucketCumulativeByMonth } from '../detailed/monthly';
import { buildReportCard } from '../detailed/reportcard';
import { buildYearNote } from '../detailed/notes';
import { selectHero, selectMoreMoments, type HeroMoment, type Moment } from '../detailed/moments';
import { renderCumulativeSentence } from '../detailed/sentence';
import type { DetailedYearData } from '../detailed/types';
import type { JourneyYear } from '../types';

const INK = '#1c1917';
const INK_SECONDARY = '#57534e';
const INK_LABEL = '#78716c';
const INK_TERTIARY = '#8a8175';

function escapeXml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export const CARD_STYLE = `
  .hero-fade, .moment-fade, .polaroid { opacity: 0; animation: memFadeIn 0.9s ease-out forwards; }
  .polaroid { animation-delay: 0s; animation-duration: 1.1s; }
  .hero-fade.d1 { animation-delay: .35s; }
  .hero-fade.d2 { animation-delay: .6s; }
  .hero-fade.d3 { animation-delay: .95s; }
  .hero-fade.d5 { animation-delay: 1.3s; }
  .hero-fade.d6 { animation-delay: 1.55s; }
  .moment-fade.m0 { animation-delay: 1.7s; }
  .moment-fade.m1 { animation-delay: 1.85s; }
  .moment-fade.m2 { animation-delay: 2.0s; }
  .moment-fade.m3 { animation-delay: 2.15s; }
  @keyframes memFadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
  @media (prefers-reduced-motion: reduce) {
    .hero-fade, .moment-fade, .polaroid { animation: none; opacity: 1; transform: none; }
  }
`;

function renderPolaroid(): string {
  return `
  <g class="polaroid" filter="url(#polaroidShadow)" transform="rotate(-4 87 150)">
    <rect x="28" y="80" width="118" height="140" rx="3" fill="#fffdf8" stroke="#e8ddc8"/>
    <rect x="36" y="88" width="102" height="98" fill="url(#photoSky)"/>
    <circle cx="118" cy="100" r="10" fill="#f6cf7e" opacity="0.8"/>
    <ellipse cx="87" cy="186" rx="40" ry="8" fill="#8b6f4e"/>
    <path d="M87,186 C87,160 78,150 87,128" fill="none" stroke="#6b9b5e" stroke-width="3" stroke-linecap="round"/>
    <path d="M87,150 C74,146 68,136 70,126" fill="none" stroke="#6b9b5e" stroke-width="3" stroke-linecap="round"/>
    <path d="M87,138 C98,133 103,124 101,114" fill="none" stroke="#6b9b5e" stroke-width="3" stroke-linecap="round"/>
    <text x="87" y="210" text-anchor="middle" font-family="'Caveat', cursive" font-size="17" fill="${INK_SECONDARY}">the start</text>
  </g>
  <rect x="60" y="70" width="40" height="15" rx="1" fill="#d9a86c" opacity="0.65" transform="rotate(6 80 77)"/>`;
}

export function renderHeroSection(hero: HeroMoment, moments: Moment[], cumulativeLines: string[]): string {
  const parts: string[] = [];

  parts.push(renderPolaroid());
  parts.push(`
  <g class="hero-fade d1"><text x="172" y="112" font-size="11" font-weight="600" fill="${INK_LABEL}" letter-spacing="1">THE START</text></g>
  <g class="hero-fade d2"><text x="172" y="150" font-size="30" font-weight="700" fill="${INK}">${escapeXml(hero.name)}</text></g>
  <g class="hero-fade d3"><text x="172" y="178" font-size="14" fill="${INK_SECONDARY}">first public repo, ${hero.date} — the floor this whole story climbs from.</text></g>`);

  parts.push(`
  <g class="hero-fade d5">`);
  cumulativeLines.forEach((line, i) => {
    parts.push(`    <text x="28" y="${252 + i * 26}" font-size="19" fill="${INK}">${escapeXml(line)}</text>`);
  });
  parts.push(`  </g>`);

  if (moments.length > 0) {
    parts.push(`
  <g class="hero-fade d6"><text x="28" y="312" font-size="12" font-weight="600" fill="${INK_LABEL}" letter-spacing=".5">MORE MOMENTS</text></g>
  <g font-size="15" fill="${INK}">`);
    moments.forEach((m, i) => {
      const y = 336 + i * 24;
      parts.push(
        `    <text class="moment-fade m${i}" x="28" y="${y}"><tspan fill="${INK_TERTIARY}" font-size="14">${m.date}</tspan>   ${escapeXml(
          m.name
        )} · ${escapeXml(m.why)}</text>`
      );
    });
    parts.push(`  </g>`);
  }

  return parts.join('\n');
}

export function heroSectionHeight(momentsCount: number): number {
  // y of the last MORE MOMENTS line (or the cumulative sentence if there are none) + closing padding
  if (momentsCount === 0) return 278 + 20;
  return 336 + (momentsCount - 1) * 24 + 20;
}

const MARGIN = 28;
const CARD_WIDTH = 840;
const CONTENT_WIDTH = CARD_WIDTH - MARGIN * 2;
const ROW_HEIGHT = 132;
const PLOT_HEIGHT = 70;
const PLOT_INSET = 10;

interface ChartSpec {
  label: string;
  color: string;
  values: number[];
  max: number;
  caption: string;
  kind: 'line' | 'bars';
}

function renderChart(spec: ChartSpec, slot: { x: number; width: number; y: number }): string {
  const plot: PlotArea = {
    x: slot.x + PLOT_INSET,
    y: slot.y + 22,
    width: slot.width - PLOT_INSET,
    height: PLOT_HEIGHT,
  };
  const plotBottom = plot.y + plot.height;
  let body: string;
  if (spec.kind === 'bars') {
    const bars = buildBars(spec.values, plot, spec.max, 4.8);
    body = bars.map((b) => `<rect x="${b.x.toFixed(1)}" y="${b.y.toFixed(1)}" width="4.8" height="${b.height.toFixed(1)}" rx="1" fill="${spec.color}"/>`).join('');
  } else {
    body = `<polyline fill="none" stroke="${spec.color}" stroke-width="2" points="${buildPolylinePoints(spec.values, plot, spec.max)}"/>`;
  }
  return `
  <text x="${slot.x}" y="${slot.y}" font-size="11" font-weight="600" fill="${INK_LABEL}">${escapeXml(spec.label)}</text>
  <line x1="${plot.x}" y1="${plotBottom}" x2="${plot.x + plot.width}" y2="${plotBottom}" stroke="#ded3bd"/>
  <text x="${plot.x - 2}" y="${plot.y + 4}" text-anchor="end" font-size="9" font-family="ui-monospace, Consolas, monospace" fill="#a39a8b">${Math.round(spec.max)}</text>
  ${body}
  <text x="${slot.x}" y="${plotBottom + 30}" font-size="10" fill="${INK_SECONDARY}">${escapeXml(spec.caption)}</text>`;
}

function buildChartSpecs(years: DetailedYearData[]): ChartSpec[] {
  const contributions = bucketByMonth(years, (y) => y.commitDayDates); // proxy: commit-day dates stand in for "contributions" volume per month
  const commitDays = contributions; // same source today; kept separate per spec's two distinct charts
  const ownOpened = bucketByMonth(years, (y) => y.ownPROpenedEvents.map((e) => e.date));
  const extOpened = bucketByMonth(years, (y) => y.externalPROpenedEvents.map((e) => e.date));
  const ownMerged = bucketByMonth(years, (y) => y.ownMergedPRs.map((e) => e.date));
  const extMerged = bucketByMonth(years, (y) => y.externalMergedPRs.map((e) => e.date));
  const reposCreated = bucketByMonth(years, (y) => y.repos.map((r) => r.createdAt));
  const starsCumulative = bucketCumulativeByMonth(years, (y) => y.starEvents.map((e) => e.starredAt));

  const totalOwnPRs = years.reduce((s, y) => s + y.metrics.ownPRs, 0);
  const totalExtPRs = years.reduce((s, y) => s + y.metrics.externalPRs, 0);
  const totalOwnMerged = years.reduce((s, y) => s + y.ownMergedPRs.length, 0);
  const totalExtMerged = years.reduce((s, y) => s + y.externalMergedPRs.length, 0);
  const totalStars = years.reduce((s, y) => s + y.metrics.starsGained, 0);
  const totalDays = years.reduce((s, y) => s + y.metrics.commitDays, 0);

  return [
    {
      label: 'CONTRIBUTIONS',
      color: '#2f8a4e',
      values: contributions,
      max: Math.max(1, ...contributions),
      caption: `${totalDays} commit days across the window.`,
      kind: 'line',
    },
    {
      label: 'COMMIT DAYS',
      color: '#2f6fce',
      values: commitDays,
      max: Math.max(1, ...commitDays),
      caption: years.map((y) => y.metrics.commitDays).join(' → ') + ' days/year.',
      kind: 'line',
    },
    {
      label: 'PULL REQUESTS',
      color: '#2f6fce',
      values: ownOpened.map((v, i) => v + extOpened[i]),
      max: Math.max(1, ...ownOpened.map((v, i) => v + extOpened[i])),
      caption: `${totalOwnPRs} own, ${totalExtPRs} external opened.`,
      kind: 'line',
    },
    {
      label: 'MERGED PRs',
      color: '#c9781f',
      values: ownMerged.map((v, i) => v + extMerged[i]),
      max: Math.max(1, ...ownMerged.map((v, i) => v + extMerged[i])),
      caption: `${totalOwnMerged} own, ${totalExtMerged} external merged.`,
      kind: 'line',
    },
    {
      label: 'REPOS CREATED',
      color: '#7c4fd1',
      values: reposCreated,
      max: Math.max(1, ...reposCreated),
      caption: `${years.reduce((s, y) => s + y.metrics.reposCreated, 0)} repos across the window.`,
      kind: 'bars',
    },
    {
      label: 'STARS (cumulative)',
      color: '#c9971f',
      values: starsCumulative,
      max: Math.max(1, ...starsCumulative),
      caption: `${totalStars} stars, cumulative.`,
      kind: 'line',
    },
    {
      label: 'REVIEWS + ISSUES (too sparse for a line)',
      color: '#d1453d',
      values: [],
      max: 1,
      caption: `${years.reduce((s, y) => s + y.metrics.reviews, 0)} reviews across the window.`,
      kind: 'line',
    },
  ];
}

function renderChartsGrid(years: DetailedYearData[], startY: number): { svg: string; endY: number } {
  const specs = buildChartSpecs(years);
  const slots = chartGridSlots(specs.length, {
    marginX: MARGIN,
    contentWidth: CONTENT_WIDTH,
    colGap: 32,
    rowHeight: ROW_HEIGHT,
    startY,
  });
  const svg = specs.map((spec, i) => renderChart(spec, slots[i])).join('\n');
  const lastRowY = Math.max(...slots.map((s) => s.y));
  return { svg, endY: lastRowY + ROW_HEIGHT - 10 };
}

function renderReportCard(years: DetailedYearData[], startY: number): { svg: string; endY: number } {
  const { rows, highs } = buildReportCard(years);
  const headerY = startY + 15;
  const rowHeight = 28;
  const cols: Array<{ key: keyof (typeof rows)[number]; label: string; x: number }> = [
    { key: 'year', label: 'Year', x: 12 },
    { key: 'language', label: 'Language', x: 60 },
    { key: 'reposActive', label: 'Repos', x: 172 },
    { key: 'longLived', label: 'Long', x: 224 },
    { key: 'days', label: 'Days', x: 276 },
    { key: 'ownPRs', label: 'Own PRs', x: 344 },
    { key: 'externalPRs', label: 'Ext PRs', x: 412 },
    { key: 'ownMerged', label: 'Own mer', x: 488 },
    { key: 'externalMerged', label: 'Ext mer', x: 564 },
    { key: 'reviews', label: 'Rev', x: 612 },
    { key: 'stars', label: 'Stars', x: 668 },
    { key: 'reposCreated', label: 'New repos', x: 768 },
  ];
  const header = cols
    .map(
      (c) =>
        `<text x="${MARGIN + c.x}" y="${headerY}" text-anchor="${c.key === 'year' || c.key === 'language' ? 'start' : 'end'}" font-size="11" font-weight="600" fill="${INK_LABEL}">${c.label}</text>`
    )
    .join('');
  const dataRows = rows
    .map((row, i) => {
      const y = headerY + 28 + i * rowHeight;
      return cols
        .map((c) => {
          const value = row[c.key];
          const star = highs.has(`${row.year}:${c.key}`) ? `<tspan fill="#b8860b">&#x2605;</tspan>` : '';
          return `<text x="${MARGIN + c.x}" y="${y}" text-anchor="${c.key === 'year' || c.key === 'language' ? 'start' : 'end'}" font-size="12" fill="${INK}">${escapeXml(String(value))}${star}</text>`;
        })
        .join('');
    })
    .join('');
  const tableHeight = 28 + rows.length * rowHeight;
  const svg = `
  <text x="${MARGIN}" y="${startY}" font-size="11" font-weight="600" fill="${INK_LABEL}">REPORT CARD</text>
  <rect x="${MARGIN}" y="${startY + 12}" width="${CONTENT_WIDTH}" height="${tableHeight}" rx="6" fill="#fffdf8" stroke="#ded3bd"/>
  ${header}
  ${dataRows}`;
  return { svg, endY: startY + 12 + tableHeight + 10 };
}

function renderYearNotes(
  years: DetailedYearData[],
  journeyYears: JourneyYear[],
  startY: number
): { svg: string; endY: number } {
  const parts: string[] = [];
  let y = startY;
  for (const detailedYear of years) {
    const journeyYear = journeyYears.find((j) => j.year === detailedYear.year);
    if (!journeyYear) continue;
    const note = buildYearNote(detailedYear, journeyYear.archetype);
    const headingColor = journeyYear.isCurrent ? '#2f8a4e' : INK_SECONDARY;
    parts.push(`
  <text x="${MARGIN}" y="${y}" font-size="13" font-weight="600" fill="${headingColor}">${escapeXml(note.heading)}</text>
  <text x="${MARGIN}" y="${y + 22}" font-size="12" fill="${INK}">
    <tspan x="${MARGIN}" dy="0">${escapeXml(note.lines[0])}</tspan>
    <tspan x="${MARGIN}" dy="18">${escapeXml(note.lines[1])}</tspan>
  </text>`);
    y += 74;
  }
  return { svg: parts.join('\n'), endY: y };
}

export function renderDetailedSvg(
  username: string,
  arcLine: string,
  years: DetailedYearData[],
  journeyYears: JourneyYear[]
): string {
  const hero = selectHero(years);
  const moments = hero ? selectMoreMoments(years, hero) : [];
  const totals = years.reduce(
    (acc, y) => ({
      commitDays: acc.commitDays + y.metrics.commitDays,
      ownPRs: acc.ownPRs + y.metrics.ownPRs,
      externalPRs: acc.externalPRs + y.metrics.externalPRs,
      ownMerged: acc.ownMerged + y.ownMergedPRs.length,
      externalMerged: acc.externalMerged + y.externalMergedPRs.length,
      starsGained: acc.starsGained + y.metrics.starsGained,
      reposCreated: acc.reposCreated + y.metrics.reposCreated,
      longLivedRepoCount: acc.longLivedRepoCount + y.metrics.longLivedRepoCount,
    }),
    { commitDays: 0, ownPRs: 0, externalPRs: 0, ownMerged: 0, externalMerged: 0, starsGained: 0, reposCreated: 0, longLivedRepoCount: 0 }
  );
  const cumulativeLines = renderCumulativeSentence({ ...totals, yearCount: years.length });

  const heroSvg = hero ? renderHeroSection(hero, moments, cumulativeLines) : '';
  const heroHeight = hero ? heroSectionHeight(moments.length) : 90;
  const analysisLabelY = 90 + heroHeight + 26;
  const chartsStartY = analysisLabelY + 16;

  const { svg: chartsSvg, endY: afterCharts } = renderChartsGrid(years, chartsStartY);
  const { svg: reportCardSvg, endY: afterReportCard } = renderReportCard(years, afterCharts + 20);
  const { svg: notesSvg, endY: notesEndY } = renderYearNotes(years, journeyYears, afterReportCard + 30);
  const totalHeight = notesEndY + 20;

  return `<svg width="${CARD_WIDTH}" height="${totalHeight}" viewBox="0 0 ${CARD_WIDTH} ${totalHeight}" xmlns="http://www.w3.org/2000/svg" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif">
  <defs>
    <style>${CARD_STYLE}</style>
    <clipPath id="cardClip"><rect x="0.5" y="0.5" width="${CARD_WIDTH - 1}" height="${totalHeight - 1}" rx="12"/></clipPath>
    <linearGradient id="photoSky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#fbe9c9"/>
      <stop offset="1" stop-color="#f3d9a8"/>
    </linearGradient>
    <filter id="paperGrain" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="7" result="noise"/>
      <feColorMatrix in="noise" type="matrix" values="0 0 0 0 0.15  0 0 0 0 0.1  0 0 0 0 0.05  0 0 0 0.05 0"/>
    </filter>
    <filter id="polaroidShadow" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="6" stdDeviation="6" flood-color="#3a2a16" flood-opacity="0.22"/>
    </filter>
  </defs>
  <g clip-path="url(#cardClip)">
    <rect x="0" y="0" width="${CARD_WIDTH}" height="${totalHeight}" fill="#faf3e6"/>
    <rect x="0" y="0" width="${CARD_WIDTH}" height="${totalHeight}" filter="url(#paperGrain)"/>
  </g>
  <rect x="0.5" y="0.5" width="${CARD_WIDTH - 1}" height="${totalHeight - 1}" rx="12" fill="none" stroke="#ded3bd"/>
  <text x="${MARGIN}" y="34" font-size="18" font-weight="700" fill="${INK}">${escapeXml(username)} · full journey</text>
  <text x="${MARGIN}" y="54" font-family="ui-monospace, Consolas, monospace" font-size="11" fill="#44403c">${escapeXml(arcLine)}</text>
  ${heroSvg}
  <line x1="${MARGIN}" y1="${analysisLabelY - 16}" x2="${CARD_WIDTH - MARGIN}" y2="${analysisLabelY - 16}" stroke="#ded3bd"/>
  <text x="${MARGIN}" y="${analysisLabelY}" font-size="11" font-weight="600" fill="${INK_LABEL}" letter-spacing="1">ANALYSIS</text>
  <text x="${MARGIN + 58}" y="${analysisLabelY}" font-size="11" fill="#8a8175">— the numbers behind the story above</text>
  ${chartsSvg}
  ${reportCardSvg}
  ${notesSvg}
</svg>`;
}
