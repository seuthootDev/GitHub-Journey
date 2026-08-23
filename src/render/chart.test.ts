import { describe, it, expect } from 'vitest';
import { buildPolylinePoints, buildBars, chartGridSlots } from './chart';

describe('buildPolylinePoints', () => {
  it('maps values to evenly spaced x, scaled y within the plot area', () => {
    const points = buildPolylinePoints([0, 5, 10], { x: 0, y: 0, width: 100, height: 50 }, 10);
    expect(points).toBe('0.0,50.0 50.0,25.0 100.0,0.0');
  });

  it('returns an empty string for no values', () => {
    expect(buildPolylinePoints([], { x: 0, y: 0, width: 100, height: 50 }, 10)).toBe('');
  });

  it('does not divide by zero when max is 0', () => {
    expect(buildPolylinePoints([0, 0], { x: 0, y: 0, width: 100, height: 50 }, 0)).toBe('0.0,50.0 100.0,50.0');
  });
});

describe('buildBars', () => {
  it('scales bar height to the plot, keeping bars bottom-anchored', () => {
    const bars = buildBars([5, 10], { x: 0, y: 0, width: 100, height: 50 }, 10, 8);
    expect(bars).toEqual([
      { x: -4, y: 25, height: 25 },
      { x: 96, y: 0, height: 50 },
    ]);
  });
});

describe('chartGridSlots', () => {
  it('pairs charts two per row', () => {
    const slots = chartGridSlots(4, { marginX: 28, contentWidth: 784, colGap: 32, rowHeight: 132, startY: 470 });
    expect(slots[0]).toMatchObject({ x: 28, width: 376, y: 470 });
    expect(slots[1]).toMatchObject({ x: 436, width: 376, y: 470 });
    expect(slots[2]).toMatchObject({ x: 28, width: 376, y: 602 });
    expect(slots[3]).toMatchObject({ x: 436, width: 376, y: 602 });
  });

  it('gives the odd chart out a full-width solo row', () => {
    const slots = chartGridSlots(3, { marginX: 28, contentWidth: 784, colGap: 32, rowHeight: 132, startY: 470 });
    expect(slots[2]).toMatchObject({ x: 28, width: 784, y: 602 });
  });
});
