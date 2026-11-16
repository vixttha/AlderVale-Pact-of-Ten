import { describe, expect, it } from 'vitest';
import { dormTourRatingFromTotals, formatDormTourRating } from '../shared/dormTours.ts';

describe('dorm tour ratings', () => {
  it('reports unrated listings when no votes exist', () => {
    expect(dormTourRatingFromTotals(0, 0)).toEqual({ ratingAvg: null, ratingCount: 0 });
    expect(formatDormTourRating(null, 0)).toBe('Unrated');
  });

  it('averages recorded votes for rated listings', () => {
    expect(dormTourRatingFromTotals(9, 2)).toEqual({ ratingAvg: 4.5, ratingCount: 2 });
    expect(formatDormTourRating(4.5, 2)).toBe('★ 4.5 (2)');
  });
});