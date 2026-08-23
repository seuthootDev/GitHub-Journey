import { describe, it, expect } from 'vitest';
import { renderHeroSection } from './detailed';

describe('renderHeroSection', () => {
  it('renders the hero name at hero scale and the cumulative sentence beneath it', () => {
    const svg = renderHeroSection(
      { date: '2024-09-01', name: 'seuthootDev' },
      [{ date: '2025-07-03', name: 'a/hanghae99-backend-week1', why: 'first own PR merged' }],
      ['You showed up 241 days in 3 years.', '124 pull requests opened, 106 merged — 23 in someone else’s repo.']
    );
    expect(svg).toContain('font-size="30" font-weight="700" fill="#1c1917">seuthootDev<');
    expect(svg).toContain('You showed up 241 days in 3 years.');
    expect(svg).toContain('2025-07-03');
    expect(svg).toContain('first own PR merged');
  });

  it('omits the More Moments label entirely when there are no moments (spec: skip the slot, no filler)', () => {
    const svg = renderHeroSection({ date: '2024-09-01', name: 'x' }, [], ['line1', 'line2']);
    expect(svg).not.toContain('MORE MOMENTS');
  });

  it('never uses a dark background or colored text — only warm paper tokens', () => {
    const svg = renderHeroSection({ date: '2024-09-01', name: 'x' }, [], ['line1', 'line2']);
    expect(svg).not.toMatch(/#0d1117|#161b22|#c9d1d9/); // old dark-theme tokens must not appear
  });
});
