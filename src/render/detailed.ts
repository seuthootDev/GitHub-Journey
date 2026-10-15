import { buildPolylinePoints, buildBars, pointAt, type PlotArea } from './chart';
import { bucketByMonth, bucketCumulativeByMonth, monthIndex } from '../detailed/monthly';
import { buildReportCard, type ReportCardRow } from '../detailed/reportcard';
import { buildYearNote } from '../detailed/notes';
import { selectHero, selectMoreMoments, type HeroMoment, type Moment } from '../detailed/moments';
import { renderCumulativeSentence } from '../detailed/sentence';
import { windowTotals } from '../detailed';
import { dominantLanguage } from '../metrics/language';
import { renderReason } from './index';
import type { DetailedYearData } from '../detailed/types';
import type { JourneyYear } from '../types';

const INK = '#1c1917';
const INK_SECONDARY = '#57534e';
const INK_LABEL = '#78716c';
const INK_FAINT = '#a39a8b';
const RULE = '#e6dcc8';
const YEAR_BAND = '#f3e9d6';
const PAPER = '#faf3e6';
const CURRENT = '#2f8a4e';
const MONO = 'ui-monospace, Consolas, monospace';

function escapeXml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function fadeDelays(selector: string, count: number, start: number, step: number): string {
  return Array.from({ length: count }, (_, i) => `  .${selector}${i} { animation-delay: ${(start + i * step).toFixed(2)}s; }`).join('\n');
}

const MAX_TIMELINE_MOMENTS = 9; // hero + up to 8 more moments
const MAX_CHART_ROWS = 5;

export const CARD_STYLE = `
  .hero-fade, .moment-fade, .polaroid, .divider-fade, .chart-fade, .reportcard-fade, .notes-fade {
    opacity: 0; animation: memFadeIn 0.9s ease-out forwards;
  }
  .polaroid { animation-delay: 0s; animation-duration: 1.1s; }
  .hero-fade.d1 { animation-delay: .3s; }
  .hero-fade.d2 { animation-delay: .5s; }
  .hero-fade.d3 { animation-delay: .75s; }
  .hero-fade.d4 { animation-delay: 1s; }
  .divider-fade { animation-delay: 1.3s; }
${fadeDelays('chart-fade.row', MAX_CHART_ROWS, 1.5, 0.15)}
${fadeDelays('moment-fade.m', MAX_TIMELINE_MOMENTS, 2.4, 0.1)}
  .reportcard-fade { animation-delay: 3.4s; }
  .notes-fade { animation-delay: 3.6s; }
  @keyframes memFadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
  @media (prefers-reduced-motion: reduce) {
    .hero-fade, .moment-fade, .polaroid, .divider-fade, .chart-fade, .reportcard-fade, .notes-fade {
      animation: none; opacity: 1; transform: none;
    }
  }
`;

function renderPolaroid(): string {
  return `
  <g class="polaroid" filter="url(#polaroidShadow)" transform="rotate(-4 87 98)">
    <rect x="28" y="28" width="118" height="140" rx="3" fill="#fffdf8" stroke="#e8ddc8"/>
    <rect x="36" y="36" width="102" height="98" fill="url(#photoSky)"/>
    <circle cx="118" cy="48" r="10" fill="#f6cf7e" opacity="0.8"/>
    <ellipse cx="87" cy="134" rx="40" ry="8" fill="#8b6f4e"/>
    <path d="M87,134 C87,108 78,98 87,76" fill="none" stroke="#6b9b5e" stroke-width="3" stroke-linecap="round"/>
    <path d="M87,98 C74,94 68,84 70,74" fill="none" stroke="#6b9b5e" stroke-width="3" stroke-linecap="round"/>
    <path d="M87,86 C98,81 103,72 101,62" fill="none" stroke="#6b9b5e" stroke-width="3" stroke-linecap="round"/>
    <text x="87" y="158" text-anchor="middle" font-family="'Caveat', cursive" font-size="17" fill="${INK_SECONDARY}">the start</text>
  </g>
  <rect x="60" y="18" width="40" height="15" rx="1" fill="#d9a86c" opacity="0.65" transform="rotate(6 80 25)"/>`;
}

export function yearSpan(years: Array<{ year: number }>): string {
  if (years.length === 0) return '';
  const first = years[0].year;
  const last = years[years.length - 1].year;
  return first === last ? String(first) : `${first} → ${last}`;
}

/**
 * Card header: who, the one-line arc, and the cumulative sentence. The polaroid and the
 * "first public repo" line only appear when there is a hero repo to anchor them.
 */
export function renderHeroSection(
  username: string,
  arcLine: string,
  span: string,
  hero: HeroMoment | null,
  cumulativeLines: string[]
): { svg: string; height: number } {
  const x = hero ? 172 : MARGIN;
  const eyebrow = span ? `FULL JOURNEY · ${span}` : 'FULL JOURNEY';
  const parts: string[] = [];
  if (hero) parts.push(renderPolaroid());
  parts.push(`
  <g class="hero-fade d1">
    <text x="${x}" y="44" font-family="${MONO}" font-size="10.5" fill="${INK_LABEL}" letter-spacing="1.2">${escapeXml(eyebrow)}</text>
    <text x="${x}" y="80" font-size="30" font-weight="700" fill="${INK}">${escapeXml(username)}</text>
  </g>
  <g class="hero-fade d2"><text x="${x}" y="106" font-size="15" fill="${INK_SECONDARY}">${escapeXml(arcLine)}</text></g>
  <g class="hero-fade d3">`);
  cumulativeLines.forEach((line, i) => {
    parts.push(`    <text x="${x}" y="${142 + i * 20}" font-size="14" fill="${INK}">${escapeXml(line)}</text>`);
  });
  parts.push(`  </g>`);
  const afterLines = 142 + cumulativeLines.length * 20;
  if (hero) {
    parts.push(
      `  <g class="hero-fade d4"><text x="${x}" y="${afterLines}" font-size="12" fill="${INK_LABEL}">first public repo, ${escapeXml(hero.date)} — the floor this whole story climbs from.</text></g>`
    );
  }
  return { svg: parts.join('\n'), height: hero ? Math.max(200, afterLines + 18) : afterLines };
}

export interface TimelineMoment {
  /** What the list shows as the date: a day, or a month for month-level moments. */
  date: string;
  label: string;
  /** Full ISO date, used for ordering and for placing the dot on the month axis. */
  at: string;
}

/**
 * Hero + more moments as one chronological list. Moments whose name is just their own
 * date (first contribution day, busiest month) show that date once instead of twice.
 */
export function timelineMoments(hero: HeroMoment | null, moments: Moment[]): TimelineMoment[] {
  const items: TimelineMoment[] = moments.map((m) =>
    m.date.startsWith(m.name)
      ? { date: m.name, label: m.why, at: m.date }
      : { date: m.date, label: `${m.why} · ${m.name}`, at: m.date }
  );
  if (hero) items.push({ date: hero.date, label: `first public repo · ${hero.name}`, at: hero.date });
  return items.sort((a, b) => a.at.localeCompare(b.at));
}

const MARGIN = 28;
const CARD_WIDTH = 840;
const CONTENT_WIDTH = CARD_WIDTH - MARGIN * 2;
const PLOT_LEFT = 140;
const PLOT_RIGHT = CARD_WIDTH - MARGIN;
const ROW_GAP = 22;

export interface ChartSeries {
  name: string;
  color: string;
  values: number[];
}

export interface ChartSpec {
  label: string;
  total: string;
  unit: string;
  kind: 'area' | 'lines' | 'bars' | 'step' | 'events';
  series: ChartSeries[];
  max: number;
  events?: Array<{ index: number; type: 'review' | 'issue' }>;
}

const ROW_HEIGHT: Record<ChartSpec['kind'], number> = { area: 54, lines: 54, bars: 44, step: 44, events: 26 };

function topPeakIndices(values: number[], count: number): number[] {
  return values
    .map((v, i) => ({ v, i }))
    // Only the rising edge of a run of equal values (e.g. a flat plateau at the top of a
    // cumulative chart) — otherwise several adjacent months tied at the same value would
    // each get their own label, reading as redundant repetition rather than a peak.
    .filter((p) => p.v > 0 && (p.i === 0 || p.v !== values[p.i - 1]))
    .sort((a, b) => b.v - a.v)
    .slice(0, count)
    .map((p) => p.i)
    .sort((a, b) => a - b);
}

function renderPeakLabel(values: number[], plot: PlotArea, max: number, color: string, dx = 0, anchor = 'middle'): string {
  return topPeakIndices(values, 1)
    .map((i) => {
      const { x, y } = pointAt(values, i, plot, max);
      return `<text x="${(x + dx).toFixed(1)}" y="${(y - 5).toFixed(1)}" text-anchor="${anchor}" font-size="10" font-weight="700" font-family="${MONO}" fill="${color}">${values[i]}</text>`;
    })
    .join('');
}

export function buildChartSpecs(years: DetailedYearData[]): ChartSpec[] {
  const commitDays = bucketByMonth(years, (y) => y.commitDayDates);
  const ownOpened = bucketByMonth(years, (y) => y.ownPROpenedEvents.map((e) => e.date));
  const extOpened = bucketByMonth(years, (y) => y.externalPROpenedEvents.map((e) => e.date));
  const ownMerged = bucketByMonth(years, (y) => y.ownMergedPRs.map((e) => e.date));
  const extMerged = bucketByMonth(years, (y) => y.externalMergedPRs.map((e) => e.date));
  const reposCreated = bucketByMonth(years, (y) =>
    y.repos.filter((r) => new Date(r.createdAt).getUTCFullYear() === y.year).map((r) => r.createdAt)
  );
  const starsCumulative = bucketCumulativeByMonth(years, (y) => y.starEvents.map((e) => e.starredAt));
  const opened = ownOpened.map((v, i) => v + extOpened[i]);
  const merged = ownMerged.map((v, i) => v + extMerged[i]);

  const totals = windowTotals(years);
  const totalReviews = years.reduce((s, y) => s + y.reviewEvents.length, 0);
  const totalIssues = years.reduce((s, y) => s + y.issueEvents.length, 0);

  const reviewEvents = years
    .flatMap((y) => y.reviewEvents.map((e) => monthIndex(years, e.date)))
    .filter((i) => i >= 0)
    .map((index) => ({ index, type: 'review' as const }));
  const issueEvents = years
    .flatMap((y) => y.issueEvents.map((e) => monthIndex(years, e.date)))
    .filter((i) => i >= 0)
    .map((index) => ({ index, type: 'issue' as const }));

  return [
    {
      label: 'COMMIT DAYS',
      total: String(totals.commitDays),
      unit: 'days active',
      kind: 'area',
      series: [{ name: 'commit days', color: '#2f8a4e', values: commitDays }],
      max: Math.max(1, ...commitDays),
    },
    {
      label: 'PULL REQUESTS',
      total: String(totals.ownPRs + totals.externalPRs),
      unit: `opened · ${totals.ownMerged + totals.externalMerged} merged`,
      kind: 'lines',
      series: [
        { name: 'opened', color: '#2f6fce', values: opened },
        { name: 'merged', color: '#c9781f', values: merged },
      ],
      max: Math.max(1, ...opened, ...merged),
    },
    {
      label: 'REPOS CREATED',
      total: String(totals.reposCreated),
      unit: 'new repos',
      kind: 'bars',
      series: [{ name: 'repos', color: '#7c4fd1', values: reposCreated }],
      max: Math.max(1, ...reposCreated),
    },
    {
      label: 'STARS',
      total: String(totals.starsGained),
      unit: 'cumulative',
      kind: 'step',
      series: [{ name: 'stars', color: '#c9971f', values: starsCumulative }],
      max: Math.max(1, ...starsCumulative),
    },
    {
      label: 'REVIEWS · ISSUES',
      total: `${totalReviews} · ${totalIssues}`,
      unit: '',
      kind: 'events',
      series: [],
      max: 1,
      events: [...reviewEvents, ...issueEvents],
    },
  ];
}

/** Last month index that has data: the month containing `now`, or the window's end once it has passed. */
export function lastElapsedMonth(years: DetailedYearData[], now: Date): number {
  const total = years.length * 12;
  if (total === 0) return -1;
  const idx = monthIndex(years, now.toISOString());
  if (idx >= 0) return idx;
  return now.getUTCFullYear() < years[0].year ? -1 : total - 1;
}

function headerReason(journeyYear: JourneyYear, year: DetailedYearData): string {
  const reason = renderReason(journeyYear.reason);
  const lang = dominantLanguage(year.metrics);
  // a language reason already names the language
  return journeyYear.reason.kind === 'metric' && lang ? `${reason}  ·  ${lang}` : reason;
}

function renderTimeline(
  years: DetailedYearData[],
  journeyYears: JourneyYear[],
  moments: TimelineMoment[],
  startY: number,
  now: Date
): { svg: string; endY: number } {
  if (years.length === 0) return { svg: '', endY: startY };

  const months = years.length * 12;
  const step = (PLOT_RIGHT - PLOT_LEFT) / months;
  const mx = (i: number) => PLOT_LEFT + step * (i + 0.5);
  const lastMonth = lastElapsedMonth(years, now);
  const elapsed = (values: number[]) => values.slice(0, lastMonth + 1);
  const plotFor = (len: number, top: number, height: number): PlotArea => ({
    x: mx(0),
    y: top,
    width: step * Math.max(0, len - 1),
    height,
  });

  const headH = 74;
  const laneY = startY + headH + 12;
  const laneH = 30;
  let rowY = laneY + laneH + 18;
  const rows = buildChartSpecs(years).map((spec) => {
    const top = rowY;
    const h = ROW_HEIGHT[spec.kind];
    rowY += h + ROW_GAP;
    return { spec, top, base: top + h, h };
  });
  const plotBottom = rowY - ROW_GAP + 8;
  const axisY = plotBottom + 16;

  // year columns: band, divider, archetype header
  const head: string[] = [];
  years.forEach((year, k) => {
    const x0 = PLOT_LEFT + k * 12 * step;
    if (k % 2 === 1) {
      head.push(`<rect x="${x0.toFixed(1)}" y="${startY}" width="${(12 * step).toFixed(1)}" height="${plotBottom - startY}" fill="${YEAR_BAND}" opacity="0.7"/>`);
    }
    if (k > 0) {
      head.push(`<line x1="${x0.toFixed(1)}" y1="${startY}" x2="${x0.toFixed(1)}" y2="${plotBottom}" stroke="${RULE}" stroke-dasharray="3 3"/>`);
    }
    const jy = journeyYears.find((j) => j.year === year.year);
    const current = jy?.isCurrent ?? false;
    const tx = (x0 + 12).toFixed(1);
    head.push(
      `<text x="${tx}" y="${startY + 18}" font-family="${MONO}" font-size="11" fill="${current ? CURRENT : INK_LABEL}">${year.year}${current ? '  ● now' : ''}</text>`
    );
    if (jy) {
      head.push(`<text x="${tx}" y="${startY + 40}" font-size="17" font-weight="700" fill="${current ? CURRENT : INK}">${escapeXml(jy.archetype)}</text>`);
      head.push(`<text x="${tx}" y="${startY + 60}" font-size="12" fill="${INK_SECONDARY}">${escapeXml(headerReason(jy, year))}</text>`);
    }
  });
  head.push(`<text x="${MARGIN}" y="${startY + 40}" font-family="${MONO}" font-size="10" fill="${INK_FAINT}" letter-spacing="1">ARCHETYPE</text>`);

  // months that have not happened yet are hatched instead of drawn as zero
  if (lastMonth < months - 1) {
    const fx = PLOT_LEFT + (lastMonth + 1) * step;
    head.push(`<rect x="${fx.toFixed(1)}" y="${laneY - 4}" width="${(PLOT_RIGHT - fx).toFixed(1)}" height="${plotBottom - laneY + 4}" fill="url(#notYet)"/>`);
    head.push(`<text x="${((fx + PLOT_RIGHT) / 2).toFixed(1)}" y="${laneY - 8}" text-anchor="middle" font-family="${MONO}" font-size="9" fill="${INK_FAINT}">not yet</text>`);
  }

  // moments lane: numbered dots, nudged right so same-month moments do not overlap;
  // moments from before the window sit hollow at its left edge
  const lc = laneY + laneH / 2;
  head.push(`<text x="${MARGIN}" y="${lc + 4}" font-family="${MONO}" font-size="10" fill="${INK_FAINT}" letter-spacing="1">MOMENTS</text>`);
  head.push(`<line x1="${PLOT_LEFT}" y1="${lc}" x2="${PLOT_RIGHT}" y2="${lc}" stroke="${RULE}" stroke-width="2"/>`);
  let lastDotX = -Infinity;
  moments.forEach((m, i) => {
    const idx = monthIndex(years, m.at);
    const x = Math.max(idx >= 0 ? mx(idx) : PLOT_LEFT + 9, lastDotX + 18);
    lastDotX = x;
    const dot =
      idx >= 0
        ? `<circle cx="${x.toFixed(1)}" cy="${lc}" r="8.5" fill="${INK}"/>`
        : `<circle cx="${x.toFixed(1)}" cy="${lc}" r="8" fill="${PAPER}" stroke="${INK}" stroke-width="1.5"/>`;
    head.push(
      `${dot}<text x="${x.toFixed(1)}" y="${lc + 3.5}" text-anchor="middle" font-family="${MONO}" font-size="9.5" font-weight="700" fill="${idx >= 0 ? PAPER : INK}">${i + 1}</text>`
    );
  });

  const body = rows.map(({ spec, top, base, h }, r) => {
    const parts: string[] = [
      `<text x="${MARGIN}" y="${top + 9}" font-family="${MONO}" font-size="10" fill="${INK_LABEL}" letter-spacing="1">${escapeXml(spec.label)}</text>`,
    ];
    if (spec.kind === 'events') {
      parts.push(`<text x="${MARGIN}" y="${top + 26}" font-size="15" font-weight="700" fill="${INK}">${escapeXml(spec.total)}</text>`);
    } else {
      parts.push(`<text x="${MARGIN}" y="${top + 32}" font-size="20" font-weight="700" fill="${INK}">${escapeXml(spec.total)}</text>`);
      parts.push(`<text x="${MARGIN}" y="${top + 47}" font-size="10.5" fill="${INK_LABEL}">${escapeXml(spec.unit)}</text>`);
      parts.push(`<line x1="${PLOT_LEFT}" y1="${base}" x2="${PLOT_RIGHT}" y2="${base}" stroke="${RULE}"/>`);
    }

    if (spec.kind === 'area' || spec.kind === 'lines') {
      spec.series.forEach((s, si) => {
        const values = elapsed(s.values);
        const plot = plotFor(values.length, top, h);
        const points = buildPolylinePoints(values, plot, spec.max);
        if (spec.kind === 'area' && values.length > 1) {
          parts.push(
            `<path d="M${plot.x.toFixed(1)},${base} L${points.split(' ').join(' L')} L${(plot.x + plot.width).toFixed(1)},${base} Z" fill="${s.color}" opacity="0.13"/>`
          );
        }
        parts.push(`<polyline fill="none" stroke="${s.color}" stroke-width="2" stroke-linejoin="round" points="${points}"/>`);
        // two series share a row: label the first peak to the left, the second to the right
        const [dx, anchor] = spec.series.length > 1 ? (si === 0 ? [-4, 'end'] : [4, 'start']) : [0, 'middle'];
        parts.push(renderPeakLabel(values, plot, spec.max, s.color, dx as number, anchor as string));
      });
      if (spec.series.length > 1) {
        spec.series.forEach((s, si) => {
          const lx = PLOT_LEFT + 8 + si * 60;
          parts.push(
            `<rect x="${lx}" y="${top + 2}" width="10" height="3" fill="${s.color}"/><text x="${lx + 14}" y="${top + 7}" font-size="10" fill="${INK_SECONDARY}">${escapeXml(s.name)}</text>`
          );
        });
      }
    } else if (spec.kind === 'bars') {
      const s = spec.series[0];
      const values = elapsed(s.values);
      const plot = plotFor(values.length, top, h);
      parts.push(
        buildBars(values, plot, spec.max, 9)
          .filter((b) => b.height > 0)
          .map((b) => `<rect x="${b.x.toFixed(1)}" y="${b.y.toFixed(1)}" width="9" height="${b.height.toFixed(1)}" rx="1.5" fill="${s.color}"/>`)
          .join('')
      );
      parts.push(renderPeakLabel(values, plot, spec.max, s.color));
    } else if (spec.kind === 'step') {
      const s = spec.series[0];
      const values = elapsed(s.values);
      const plot = plotFor(values.length, top, h);
      const xs: number[] = [];
      const pts = values.flatMap((_, i) => {
        const py = pointAt(values, i, plot, spec.max).y.toFixed(1);
        xs.push(mx(i) - step / 2, mx(i) + step / 2);
        return [`${(mx(i) - step / 2).toFixed(1)},${py}`, `${(mx(i) + step / 2).toFixed(1)},${py}`];
      });
      if (pts.length > 0) {
        parts.push(`<path d="M${xs[0].toFixed(1)},${base} L${pts.join(' L')} L${xs[xs.length - 1].toFixed(1)},${base} Z" fill="${s.color}" opacity="0.13"/>`);
        parts.push(`<polyline fill="none" stroke="${s.color}" stroke-width="2" points="${pts.join(' ')}"/>`);
        const lastValue = values[values.length - 1];
        if (lastValue > 0) {
          const ly = pointAt(values, values.length - 1, plot, spec.max).y;
          parts.push(
            `<text x="${(mx(values.length - 1) + 2).toFixed(1)}" y="${(ly - 5).toFixed(1)}" text-anchor="end" font-size="10" font-weight="700" font-family="${MONO}" fill="#b8860b">${lastValue}</text>`
          );
        }
      }
    } else {
      // events stack upward within a month so two reviews never read as one
      const lineY = top + 13;
      parts.push(`<line x1="${PLOT_LEFT}" y1="${lineY}" x2="${PLOT_RIGHT}" y2="${lineY}" stroke="${RULE}"/>`);
      const used = new Map<number, number>();
      for (const e of spec.events ?? []) {
        const slot = used.get(e.index) ?? 0;
        used.set(e.index, slot + 1);
        const ey = lineY - slot * 10;
        const ex = mx(e.index);
        parts.push(
          e.type === 'review'
            ? `<circle cx="${ex.toFixed(1)}" cy="${ey}" r="4" fill="#2f6fce"/>`
            : `<rect x="${(ex - 4).toFixed(1)}" y="${ey - 4}" width="8" height="8" fill="#d1453d"/>`
        );
      }
      parts.push(
        `<circle cx="${PLOT_LEFT + 12}" cy="${top + 4}" r="3.5" fill="#2f6fce"/><text x="${PLOT_LEFT + 20}" y="${top + 7.5}" font-size="10" fill="${INK_SECONDARY}">review</text>`,
        `<rect x="${PLOT_LEFT + 62}" y="${top + 0.5}" width="7" height="7" fill="#d1453d"/><text x="${PLOT_LEFT + 74}" y="${top + 7.5}" font-size="10" fill="${INK_SECONDARY}">issue</text>`
      );
    }
    return `<g class="chart-fade row${r}">\n  ${parts.join('\n  ')}\n</g>`;
  });

  const axis: string[] = [];
  years.forEach((_, k) => {
    ['Jan', 'Apr', 'Jul', 'Oct'].forEach((name, q) => {
      const x = mx(k * 12 + q * 3).toFixed(1);
      axis.push(
        `<line x1="${x}" y1="${plotBottom}" x2="${x}" y2="${plotBottom + 4}" stroke="${INK_FAINT}"/><text x="${x}" y="${axisY}" text-anchor="middle" font-family="${MONO}" font-size="9" fill="${INK_FAINT}">${name}</text>`
      );
    });
  });

  const list: string[] = [];
  let endY = axisY;
  if (moments.length > 0) {
    const ruleY = axisY + 20;
    const labelY = ruleY + 26;
    list.push(`<line x1="${MARGIN}" y1="${ruleY}" x2="${PLOT_RIGHT}" y2="${ruleY}" stroke="${RULE}"/>`);
    list.push(`<text x="${MARGIN}" y="${labelY}" font-family="${MONO}" font-size="10.5" fill="${INK_LABEL}" letter-spacing="1.2">MOMENTS</text>`);
    moments.forEach((m, i) => {
      const y = labelY + 30 + i * 22;
      list.push(
        `<g class="moment-fade m${i}"><circle cx="36" cy="${y - 4}" r="8" fill="${INK}"/><text x="36" y="${y - 0.5}" text-anchor="middle" font-family="${MONO}" font-size="9.5" font-weight="700" fill="${PAPER}">${i + 1}</text>` +
          `<text x="54" y="${y}" font-family="${MONO}" font-size="11.5" fill="${INK_LABEL}">${escapeXml(m.date)}</text>` +
          `<text x="140" y="${y}" font-size="12.5" fill="${INK_SECONDARY}">${escapeXml(m.label)}</text></g>`
      );
      endY = y;
    });
  }

  const svg = [`<g class="divider-fade">\n  ${head.join('\n  ')}\n</g>`, ...body, ...axis, ...list].join('\n');
  return { svg, endY };
}

const FRIENDLY_COLUMN: Record<string, string> = {
  reposActive: 'active repos',
  longLived: 'long-lived repos',
  days: 'commit days',
  ownPRs: 'own PRs',
  externalPRs: 'external PRs',
  ownMerged: 'own merges',
  externalMerged: 'external merges',
  reviews: 'reviews',
  stars: 'stars',
  reposCreated: 'repos created',
};

function comebackFraming(rows: ReportCardRow[], yearsWithHighs: number[]): string {
  const first = rows[0];
  const last = rows[rows.length - 1];
  if (last.days > first.days) {
    return `${first.year} is the floor, not a failure — ${first.days} → ${last.days} commit days is the story.`;
  } else if (yearsWithHighs.length === 1) {
    return `${yearsWithHighs[0]} led every column this window.`;
  }
  return 'Every column stayed flat this window.';
}

function reportCardReading(rows: ReportCardRow[], highs: Set<string>): [string, string] {
  const line1 = '★ is the high mark in that column.';
  if (rows.length === 0) return [line1, ''];

  const highCountByYear = new Map<number, number>();
  const columnsByYear = new Map<number, string[]>();
  const yearsByColumn = new Map<string, number[]>();
  for (const key of highs) {
    const [yearStr, col] = key.split(':');
    const year = Number(yearStr);
    highCountByYear.set(year, (highCountByYear.get(year) ?? 0) + 1);
    columnsByYear.set(year, [...(columnsByYear.get(year) ?? []), col]);
    yearsByColumn.set(col, [...(yearsByColumn.get(col) ?? []), year]);
  }

  const yearsWithHighs = [...highCountByYear.keys()];
  let line2: string;
  if (yearsWithHighs.length >= 2) {
    const sorted = [...yearsWithHighs].sort((a, b) => highCountByYear.get(a)! - highCountByYear.get(b)!);
    const otherYear = sorted[0];
    const topYear = sorted[sorted.length - 1];
    // Only name a column where otherYear is the UNIQUE high — buildReportCard marks every
    // tied high, so a shared column would make "had the most X" a false claim.
    const uniqueColumn = (columnsByYear.get(otherYear) ?? []).find(
      (col) => (yearsByColumn.get(col) ?? []).length === 1
    );
    if (uniqueColumn) {
      line2 = `${otherYear} had the most ${FRIENDLY_COLUMN[uniqueColumn] ?? uniqueColumn}. ${topYear} took the rest.`;
    } else {
      line2 = comebackFraming(rows, yearsWithHighs);
    }
  } else {
    line2 = comebackFraming(rows, yearsWithHighs);
  }

  return [line1, line2];
}

function renderReportCard(years: DetailedYearData[], startY: number): { svg: string; endY: number } {
  const { rows, highs } = buildReportCard(years);
  // Table box top is startY+12; header text sits 19px into that box (matching the
  // original design reference), not flush against the top border.
  const headerY = startY + 12 + 19;
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
  const tableEndY = startY + 12 + tableHeight;
  const [reading1, reading2] = reportCardReading(rows, highs);
  const svg = `
  <g class="reportcard-fade">
  <text x="${MARGIN}" y="${startY}" font-size="11" font-weight="600" fill="${INK_LABEL}">REPORT CARD</text>
  <rect x="${MARGIN}" y="${startY + 12}" width="${CONTENT_WIDTH}" height="${tableHeight}" rx="6" fill="#fffdf8" stroke="#ded3bd"/>
  ${header}
  ${dataRows}
  <text x="${MARGIN}" y="${tableEndY + 20}" font-size="12" fill="${INK_SECONDARY}">${escapeXml(reading1)}</text>
  <text x="${MARGIN}" y="${tableEndY + 38}" font-size="12" fill="${INK_SECONDARY}">${escapeXml(reading2)}</text>
  </g>`;
  return { svg, endY: tableEndY + 38 + 10 };
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
  return { svg: `<g class="notes-fade">${parts.join('\n')}</g>`, endY: y };
}

export function renderDetailedSvg(
  username: string,
  arcLine: string,
  years: DetailedYearData[],
  journeyYears: JourneyYear[],
  now: Date = new Date()
): string {
  const hero = selectHero(years);
  const moments = timelineMoments(hero, selectMoreMoments(years, hero));
  const totals = windowTotals(years);
  const cumulativeLines = renderCumulativeSentence({ ...totals, yearCount: years.length });

  const { svg: heroSvg, height: heroHeight } = renderHeroSection(username, arcLine, yearSpan(years), hero, cumulativeLines);
  const { svg: timelineSvg, endY: afterTimeline } = renderTimeline(years, journeyYears, moments, heroHeight + 20, now);
  const { svg: reportCardSvg, endY: afterReportCard } = renderReportCard(years, afterTimeline + 40);
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
    <pattern id="notYet" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <rect width="6" height="6" fill="${PAPER}"/>
      <line x1="0" y1="0" x2="0" y2="6" stroke="${RULE}" stroke-width="2"/>
    </pattern>
  </defs>
  <g clip-path="url(#cardClip)">
    <rect x="0" y="0" width="${CARD_WIDTH}" height="${totalHeight}" fill="${PAPER}"/>
    <rect x="0" y="0" width="${CARD_WIDTH}" height="${totalHeight}" filter="url(#paperGrain)"/>
  </g>
  <rect x="0.5" y="0.5" width="${CARD_WIDTH - 1}" height="${totalHeight - 1}" rx="12" fill="none" stroke="#ded3bd"/>
  ${heroSvg}
  ${timelineSvg}
  ${reportCardSvg}
  ${notesSvg}
</svg>`;
}
