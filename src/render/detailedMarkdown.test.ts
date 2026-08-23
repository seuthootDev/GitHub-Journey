import { describe, it, expect } from 'vitest';
import { renderComfortLayerMarkdown } from './detailedMarkdown';

describe('renderComfortLayerMarkdown', () => {
  it('renders the cumulative sentence and moments as markdown, readable without the image', () => {
    const md = renderComfortLayerMarkdown(
      { date: '2024-09-01', name: 'seuthootDev' },
      [{ date: '2025-07-03', name: 'a/hanghae99-backend-week1', why: 'first own PR merged' }],
      ['You showed up 241 days in 3 years.', '124 pull requests opened, 106 merged — 23 in someone else\'s repo.']
    );
    expect(md).toContain('2024-09-01');
    expect(md).toContain('seuthootDev');
    expect(md).toContain('You showed up 241 days in 3 years.');
    expect(md).toContain('2025-07-03');
    expect(md).toContain('first own PR merged');
  });

  it('omits the moments list entirely when there are none', () => {
    const md = renderComfortLayerMarkdown({ date: '2024-09-01', name: 'x' }, [], ['a', 'b']);
    expect(md).not.toContain('More moments');
  });
});
