import {
  Button,
  Group,
  Text,
  Progress,
  Stepper,
  Box,
} from "@mantine/core";

import {
  useState,
} from "react";

import ForecastStep
  from "./ForecastStep";

import BaselineStep
  from "./BaselineStep";

import InvestmentsStep
  from "./InvestmentsStep";

import EventsStep
  from "./EventsStep";

import InstrumentsStep
  from "./InstrumentsStep";

import ReviewStep
  from "./ReviewStep";
import { useBuilderStore } from "../../store/builderStore";

export default function BuilderWizard() {
  const [
    active,
    setActive,
  ] = useState(0);

  const builderState =
    useBuilderStore(
      (store) =>
        store.state
    );

  const nextStep = () =>
    setActive(
      (current) =>
        Math.min(
          current + 1,
          5
        )
    );

  const prevStep =
    () =>
      setActive(
        (current) =>
          Math.max(
            current - 1,
            0
          )
      );

  const isCurrentStepValid =
    (() => {
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
            builderState.openingCash >= 0 &&
            builderState.openingInvestmentCorpus >= 0
          );

        case 2:
          return (
            builderState.investmentRanges
              .length > 0
          );

        case 3:
          return true;

        case 4:
          return true;

        case 5:
          return true;

        default:
          return false;
      }
    })();

  return (
    <>
      <Stepper
        active={active}
        allowNextStepsSelect={
          false
        }
        visibleFrom="md"
      >
        <Stepper.Step
          label="Forecast"
          description="Timeline"
        >
          <ForecastStep />
        </Stepper.Step>

        <Stepper.Step
          label="Baseline"
          description="Income & Cash"
        >
          <BaselineStep />
        </Stepper.Step>

        <Stepper.Step
          label="Investments"
          description="Recurring Investments"
        >
          <InvestmentsStep />
        </Stepper.Step>

        <Stepper.Step
          label="Events"
          description="Bonuses & Expenses"
        >
          <EventsStep />
        </Stepper.Step>

        <Stepper.Step
          label="Instruments"
          description="FD & RD"
        >
          <InstrumentsStep />
        </Stepper.Step>

        <Stepper.Step
          label="Review"
          description="Generate"
        >
          <ReviewStep />
        </Stepper.Step>
      </Stepper>

      <Box hiddenFrom="md">
        <Text
          ta="center"
          fw={600}
          mb="xs"
        >
          Step {active + 1} of 6
        </Text>

        <Progress
          value={
            ((active + 1) / 6) *
            100
          }
          size="lg"
          radius="xl"
          mb="lg"
        />

        {active === 0 && (
          <ForecastStep />
        )}

        {active === 1 && (
          <BaselineStep />
        )}

        {active === 2 && (
          <InvestmentsStep />
        )}

        {active === 3 && (
          <EventsStep />
        )}

        {active === 4 && (
          <InstrumentsStep />
        )}

        {active === 5 && (
          <ReviewStep />
        )}
      </Box>

      <Group
        justify="center"
        gap="xl"
        mt="xl"
      >
        <Button
          variant="default"
          disabled={
            active === 0
          }
          onClick={
            prevStep
          }
        >
          Back
        </Button>

        <Button
          onClick={
            nextStep
          }
          disabled={
            active === 5 ||
            !isCurrentStepValid
          }
        >
          Next
        </Button>
      </Group>
    </>
  );
}