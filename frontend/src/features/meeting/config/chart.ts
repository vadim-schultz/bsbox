/**
 * Color palette for chart lines.
 * Uses hex values as required by Recharts.
 */
export const chartPalette = [
  "#2B6CB0", // blue.600
  "#DD6B20", // orange.500
  "#2F855A", // green.600
  "#805AD5", // purple.500
  "#B83280", // pink.600
  "#718096", // gray.500
  "#38A169", // green.500
  "#E53E3E", // red.500
] as const;

/**
 * Default chart dimensions and styling.
 */
export const chartConfig = {
  height: 320,
  margin: { left: 12, right: 48 },
  strokeWidth: {
    overall: 2,
    participant: 1.5,
  },
  area: {
    engagedColor: "#38A169", // green.500
    notEngagedColor: "#A0AEC0", // gray.400
    engagedOpacity: 0.3,
    notEngagedOpacity: 0.2,
  },
} as const;
