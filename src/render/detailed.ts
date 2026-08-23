import type { HeroMoment, Moment } from '../detailed/moments';

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
