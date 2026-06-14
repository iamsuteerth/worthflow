// src/components/builder/BuilderStepContainer.tsx
import { Center, Stack } from "@mantine/core";
import type { ReactNode } from "react";

interface Props {
  children: ReactNode;
}

export default function BuilderStepContainer({ children }: Props) {
  return (
    <Center mt="xl" mb="xl">
      <Stack w="100%" maw={680} gap="lg">
        {children}
      </Stack>
    </Center>
  );
}