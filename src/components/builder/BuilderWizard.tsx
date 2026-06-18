import {
  Box,
  Button,
  Group,
  Progress,
  Stepper,
  Text,
} from "@mantine/core";
import { IconArrowLeft, IconArrowRight } from "@tabler/icons-react";
import { useState } from "react";
import { useBuilderStore } from "@/store/builderStore";
import BaselineStep from "@/components/builder/BaselineStep";
import EventsStep from "@/components/builder/EventsStep";
import ForecastStep from "@/components/builder/ForecastStep";
import InstrumentsStep from "@/components/builder/InstrumentsStep";
import InvestmentsStep from "@/components/builder/InvestmentsStep";
import ReviewStep from "@/components/builder/ReviewStep";

const STEPS = [
  { label: "Forecast", description: "Timeline" },
  { label: "Baseline", description: "Income & Cash" },
  { label: "Investments", description: "Recurring" },
  { label: "Events", description: "Bonuses & Expenses" },
  { label: "Instruments", description: "FD & RD" },
  { label: "Review", description: "Generate" },
];

export default function BuilderWizard() {
  const [active, setActive] = useState(0);

  const builderState = useBuilderStore((store) => store.state);

  const nextStep = () => setActive((current) => Math.min(current + 1, 5));
  const prevStep = () => setActive((current) => Math.max(current - 1, 0));

  const isCurrentStepValid = (() => {
    switch (active) {
      case 0:
        return (
          !!builderState.startMonth &&
          builderState.totalMonths >= 12 &&
          builderState.totalMonths <= 48
        );
      case 1:
        return (
          builderState.monthlyIncome >= 1000 &&
          builderState.defaultMonthlyExpense >= 0 &&
          builderState.openingCash >= 0
        );
      case 2:
        return true;
      case 3:
      case 4:
      case 5:
        return true;
      default:
        return false;
    }
  })();

  const stepContent = [
    <ForecastStep />,
    <BaselineStep />,
    <InvestmentsStep />,
    <EventsStep />,
    <InstrumentsStep />,
    <ReviewStep />,
  ];

  return (
    <>
      <Stepper
        active={active}
        allowNextStepsSelect={false}
        visibleFrom="md"
        styles={{
          stepLabel: { fontWeight: 600 },
          stepDescription: { fontSize: 12 },
        }}
      >
        {STEPS.map((step) => (
          <Stepper.Step key={step.label} label={step.label} description={step.description} />
        ))}
      </Stepper>

      <Box visibleFrom="md">{stepContent[active]}</Box>

      <Box hiddenFrom="md">
        <Group justify="space-between" mb={4}>
          <Text size="sm" fw={600} c="dimmed">
            Step {active + 1} of 6
          </Text>
          <Text size="sm" fw={700}>
            {STEPS[active].label}
          </Text>
        </Group>
        <Progress
          value={((active + 1) / 6) * 100}
          size="sm"
          radius="xl"
          mb="lg"
          color="brand"
        />
        {stepContent[active]}
      </Box>

      <Group justify="center" gap="md" mt="xl" pb="xl">
        <Button
          variant="default"
          disabled={active === 0}
          onClick={prevStep}
          leftSection={<IconArrowLeft size={16} />}
        >
          Back
        </Button>
        <Button
          onClick={nextStep}
          disabled={active === 5 || !isCurrentStepValid}
          rightSection={<IconArrowRight size={16} />}
        >
          {active === 4 ? "Review" : "Next"}
        </Button>
      </Group>
    </>
  );
}