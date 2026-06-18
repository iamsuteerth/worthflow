import { Text } from "@mantine/core";

interface SectionLabelProps {
  children: string;
}

export function SectionLabel({ children }: SectionLabelProps) {
  return (
    <Text
      size="xs"
      fw={600}
      c="dimmed"
      tt="uppercase"
      style={{ letterSpacing: "0.06em" }}
    >
      {children}
    </Text>
  );
}
