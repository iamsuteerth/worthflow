// Single source of truth for semantic colour roles.
export const SEMANTIC = {
  positive: "teal",
  negative: "red",
  neutral: "gray",
  investment: "violet",
  instrumentFd: "cyan",
  instrumentRd: "grape",
  warning: "yellow",
  brand: "brand",
} as const;

export type SemanticRole = keyof typeof SEMANTIC;

export function deltaColor(value: number): string {
  if (value > 0) return SEMANTIC.positive;
  if (value < 0) return SEMANTIC.negative;
  return SEMANTIC.neutral;
}
