export function calculateViralityScore(currentViews?: number | null, averageViews?: number | null) {
  if (currentViews == null || averageViews == null || !Number.isFinite(currentViews) || !Number.isFinite(averageViews) || currentViews < 0 || averageViews <= 0) return null;
  return Number((currentViews / averageViews).toFixed(2));
}
