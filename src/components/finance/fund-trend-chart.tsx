type Point = { date: string; values: Array<number | null> };
type Series = { label: string; color: string };

export function FundTrendChart({ points, series }: { points: Point[]; series: Series[] }) {
  const values = points.flatMap((point) => point.values).filter((value): value is number => value != null && Number.isFinite(value));
  if (points.length < 2 || values.length < 2) return null;
  const width = 680, height = 220, left = 14, right = 14, top = 16, bottom = 28;
  const min = Math.min(...values), max = Math.max(...values), span = max - min || Math.max(Math.abs(max), 1) * 0.02;
  const x = (index: number) => left + index * ((width - left - right) / Math.max(points.length - 1, 1));
  const y = (value: number) => top + (max - value) * ((height - top - bottom) / span);
  return <div className="mt-4 overflow-hidden rounded-2xl bg-surface-muted p-3">
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={series.map((item) => item.label).join("与") + "趋势"} className="h-auto w-full">
      {[0, .5, 1].map((ratio) => <line key={ratio} x1={left} x2={width-right} y1={top + ratio*(height-top-bottom)} y2={top + ratio*(height-top-bottom)} stroke="#d8ddd8" strokeWidth="1" />)}
      {series.map((item, seriesIndex) => { const line = points.map((point, index) => point.values[seriesIndex] == null ? null : `${x(index)},${y(Number(point.values[seriesIndex]))}`).filter(Boolean).join(" "); return <polyline key={item.label} points={line} fill="none" stroke={item.color} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />; })}
      <text x={left} y={height-6} fontSize="12" fill="#718078">{shortDate(points[0].date)}</text>
      <text x={width-right} y={height-6} textAnchor="end" fontSize="12" fill="#718078">{shortDate(points.at(-1)!.date)}</text>
    </svg>
    <div className="flex flex-wrap gap-4 px-1 pb-1">{series.map((item) => <span key={item.label} className="flex items-center gap-2 text-xs text-muted-foreground"><i className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />{item.label}</span>)}</div>
  </div>;
}

const shortDate = (date: string) => date.slice(5).replace("-", "/");
