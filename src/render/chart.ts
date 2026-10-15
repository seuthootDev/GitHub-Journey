export interface PlotArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

function scaleY(value: number, max: number, plot: PlotArea): number {
  if (max <= 0) return plot.y + plot.height;
  return plot.y + plot.height - (value / max) * plot.height;
}

export function pointAt(values: number[], index: number, plot: PlotArea, max: number): { x: number; y: number } {
  const n = values.length;
  const stepX = n <= 1 ? 0 : plot.width / (n - 1);
  return { x: plot.x + index * stepX, y: scaleY(values[index], max, plot) };
}

export function buildPolylinePoints(values: number[], plot: PlotArea, max: number): string {
  const n = values.length;
  if (n === 0) return '';
  const stepX = n === 1 ? 0 : plot.width / (n - 1);
  return values
    .map((v, i) => `${(plot.x + i * stepX).toFixed(1)},${scaleY(v, max, plot).toFixed(1)}`)
    .join(' ');
}

export function buildBars(
  values: number[],
  plot: PlotArea,
  max: number,
  barWidth: number
): Array<{ x: number; y: number; height: number }> {
  const n = values.length;
  if (n === 0) return [];
  const stepX = n === 1 ? 0 : plot.width / (n - 1);
  return values.map((v, i) => {
    const height = max <= 0 ? 0 : (v / max) * plot.height;
    return {
      x: plot.x + i * stepX - barWidth / 2,
      y: plot.y + plot.height - height,
      height,
    };
  });
}
