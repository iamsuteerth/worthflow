import { Badge, ThemeIcon } from "@mantine/core";
import { getEventVisual } from "@/theme/eventVisuals";

interface EventBadgeProps {
  type: string;
  size?: "xs" | "sm" | "md" | "lg";
}

interface EventGlyphProps {
  type: string;
  size?: "xs" | "sm" | "md" | "lg";
  iconSize?: number;
}

export function EventBadge({ type, size = "sm" }: EventBadgeProps) {
  const vis = getEventVisual(type);
  return (
    <Badge color={vis.color} variant="light" size={size} radius="xl">
      {vis.label}
    </Badge>
  );
}

export function EventGlyph({ type, size = "md", iconSize = 16 }: EventGlyphProps) {
  const vis = getEventVisual(type);
  return (
    <ThemeIcon size={size} radius="xl" variant="light" color={vis.color}>
      <vis.Icon size={iconSize} />
    </ThemeIcon>
  );
}
