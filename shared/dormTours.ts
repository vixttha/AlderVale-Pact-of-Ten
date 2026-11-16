export type DormTourListing = {
  wizardId: string;
  wizardName: string;
  themeId: string;
  ratingAvg: number | null;
  ratingCount: number;
};

export function dormTourRatingFromTotals(ratingSum: unknown, ratingCount: unknown): Pick<DormTourListing, 'ratingAvg' | 'ratingCount'> {
  const count = typeof ratingCount === 'number' && Number.isFinite(ratingCount) ? Math.max(0, Math.floor(ratingCount)) : 0;
  if (count <= 0) return { ratingAvg: null, ratingCount: 0 };
  const sum = typeof ratingSum === 'number' && Number.isFinite(ratingSum) ? ratingSum : 0;
  return { ratingAvg: Number((sum / count).toFixed(1)), ratingCount: count };
}

export function formatDormTourRating(ratingAvg: number | null, ratingCount: number): string {
  if (ratingCount <= 0 || ratingAvg === null) return 'Unrated';
  return `★ ${ratingAvg} (${ratingCount})`;
}