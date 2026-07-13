import type { ReactNode } from "react";

import { Center, Stack } from "@mantine/core";

interface Props {
  children: ReactNode;
}

export default function BuilderStepContainer({ children }: Props) {
  return (
    <Center mt="xl" mb="xl">
      <Stack w="100%" maw={850} gap="lg">
        {children}
      </Stack>
    </Center>
  );
}