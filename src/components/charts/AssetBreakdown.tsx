import {
  Card,
  Stack,
  Text,
} from "@mantine/core";

import {
  PieChart,
} from "@mantine/charts";

import {
  useSimulation,
} from "../../hooks/useSimulation";

export default function AssetBreakdown() {
  const result =
    useSimulation();

  const finalRow =
    result.rows[
      result.rows.length - 1
    ];

  const data = [
    {
      name: "Cash",
      value:
        finalRow.assets.cash,
      color: "blue",
    },

    {
      name: "Investments",
      value:
        finalRow.assets
          .investmentCorpus,
      color: "green",
    },

    {
      name: "FD",
      value:
        finalRow.assets.fdValue,
      color: "orange",
    },

    {
      name: "RD",
      value:
        finalRow.assets.rdValue,
      color: "violet",
    },
  ].filter(
    (item) => item.value > 0
  );

  return (
    <Card
      mt="lg"
      radius="xl"
      shadow="xs"
      withBorder
      p="lg"
    >
      <Stack>
        <Text fw={700}>
          Asset Breakdown
        </Text>

        <PieChart
          h={320}
          data={data}
        />
      </Stack>
    </Card>
  );
}