import {
  Badge,
  Group,
  Paper,
  Text,
} from "@mantine/core";

import {
  usePlannerStore,
} from "../../store/plannerStore";

export default function ScenarioBanner() {
  const events =
    usePlannerStore(
      (state) =>
        state.overrides
          .runtimeEvents
    ) ?? [];
  if (
    events.length === 0
  ) {
    return null;
  }

  const counts = {
    expense: events.filter(
      (event) =>
        event.type ===
        "ONE_OFF_EXPENSE"
    ).length,

    credit_card_expense: events.filter(
      (event) =>
        event.type ===
        "CREDIT_CARD_EXPENSE"
    ).length,

    bonus: events.filter(
      (event) =>
        event.type ===
        "BONUS_INCOME"
    ).length,

    salary: events.filter(
      (event) =>
        event.type ===
        "SALARY_CHANGE"
    ).length,

    fd: events.filter(
      (event) =>
        event.type === "FD"
    ).length,

    rd: events.filter(
      (event) =>
        event.type === "RD"
    ).length,
  };

  return (
    <Paper
      radius="xl"
      p="md"
      mt="md"
      withBorder
    >
      <Group
        justify="space-between"
      >
        <div>
          <Text
            fw={600}
          >
            Scenario Active
          </Text>

          <Text
            size="sm"
            c="dimmed"
          >
            {
              events.length
            }{" "}
            modification
            {events.length > 1
              ? "s"
              : ""}
          </Text>
        </div>

        <Group gap={6}>
          {counts.expense > 0 && (
            <Badge
              color="red"
              variant="light"
            >
              Expense ×
              {" "}
              {counts.expense}
            </Badge>
          )}

          {counts.credit_card_expense > 0 && (
            <Badge
              color="orange"
              variant="light"
            >
              Credit Card ×
              {" "}
              {counts.credit_card_expense}
            </Badge>
          )}

          {counts.bonus > 0 && (
            <Badge
              color="green"
              variant="light"
            >
              Bonus ×
              {" "}
              {counts.bonus}
            </Badge>
          )}

          {counts.salary > 0 && (
            <Badge
              color="blue"
              variant="light"
            >
              Salary ×
              {" "}
              {counts.salary}
            </Badge>
          )}

          {counts.fd > 0 && (
            <Badge
              color="cyan"
              variant="light"
            >
              FD × {counts.fd}
            </Badge>
          )}

          {counts.rd > 0 && (
            <Badge
              color="grape"
              variant="light"
            >
              RD × {counts.rd}
            </Badge>
          )}
        </Group>
      </Group>
    </Paper>
  );
}