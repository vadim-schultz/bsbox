/**
 * A single data point for the engagement chart.
 * Contains a bucket timestamp, display label, overall value, and engagement breakdown.
 */
export type ChartPoint = {
  bucket: number; // Timestamp in milliseconds for x-axis
  label: string;
  overall?: number | null;
  engagedCount: number;
  notEngagedCount: number;
  engagedPercent: number;
  notEngagedPercent: number;
  totalParticipants: number;
};
