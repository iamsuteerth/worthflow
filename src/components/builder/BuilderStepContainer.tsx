import {
  Center,
  Stack,
} from "@mantine/core";

import type {
  ReactNode,
} from "react";

interface Props {
  children: ReactNode;
}

export default function BuilderStepContainer({
  children,
}: Props) {
  return (
    <Center mt="xl">
      <Stack
        w="100%"
        maw={700}
      >
        {children}
      </Stack>
    </Center>
  );
}