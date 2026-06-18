import { Card, type CardProps } from "@mantine/core";
import type { ReactNode } from "react";

interface SurfaceCardProps extends Omit<CardProps, "radius" | "shadow" | "withBorder"> {
  children: ReactNode;
}

export function SurfaceCard({ children, ...props }: SurfaceCardProps) {
  return (
    <Card radius="lg" shadow="sm" withBorder {...props}>
      {children}
    </Card>
  );
}
