import type { ReactNode } from "react";

import { Button, Card, Group, Modal, Stack, Text, ThemeIcon } from "@mantine/core";
import { IconChartLine, IconFlask, IconPlayerPlay } from "@tabler/icons-react";

import { usePlannerStore } from "@/store/plannerStore";
import { useUiStore } from "@/store/uiStore";
import { startForecastTour } from "@/components/onboarding/forecastTour";
import { startScenarioTour } from "@/components/onboarding/scenarioTour";

interface Props {
  opened: boolean;
  onClose: () => void;
}

function TourRow({
  icon,
  color,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  color: string;
  title: string;
  description: string;
  action: ReactNode;
}) {
  return (
    <Card withBorder radius="md" p="md">
      <Group justify="space-between" wrap="nowrap" align="center" gap="md">
        <Group wrap="nowrap" gap="sm" style={{ minWidth: 0 }}>
          <ThemeIcon variant="light" color={color} size="lg" radius="md">
            {icon}
          </ThemeIcon>
          <Stack gap={2} style={{ minWidth: 0 }}>
            <Text fw={600} size="sm">
              {title}
            </Text>
            <Text size="xs" c="dimmed">
              {description}
            </Text>
          </Stack>
        </Group>
        {action}
      </Group>
    </Card>
  );
}

export default function TutorialModal({ opened, onClose }: Props) {
  const setActiveView = usePlannerStore((s) => s.setActiveView);
  const openScenarioDrawer = useUiStore((s) => s.openScenarioDrawer);
  const setScenarioSection = useUiStore((s) => s.setScenarioSection);

  function replayForecast() {
    onClose();
    // Ensure the forecast page is showing (its targets must exist), then start once painted.
    setActiveView("forecast");
    window.setTimeout(() => startForecastTour(), 500);
  }

  function replayScenario() {
    onClose();
    // The Lab lives on the forecast view; open it on a form-bearing section so every target
    // exists, then start once it has rendered.
    setActiveView("forecast");
    openScenarioDrawer();
    setScenarioSection("expenses");
    window.setTimeout(() => startScenarioTour(), 550);
  }

  return (
    <Modal opened={opened} onClose={onClose} title="Tutorials" centered size="md">
      <Stack gap="sm">
        <Text size="sm" c="dimmed">
          Replay a guided walkthrough anytime.
        </Text>

        <TourRow
          icon={<IconChartLine size={18} />}
          color="brand"
          title="Forecast page"
          description="Your headline numbers, the net-worth chart, the detail tabs and scenarios."
          action={
            <Button size="xs" leftSection={<IconPlayerPlay size={14} />} onClick={replayForecast} style={{ flexShrink: 0 }}>
              Start
            </Button>
          }
        />

        <TourRow
          icon={<IconFlask size={18} />}
          color="violet"
          title="Scenario Lab"
          description="Build what-ifs, save named scenarios and compare them against your base plan."
          action={
            <Button size="xs" color="violet" leftSection={<IconPlayerPlay size={14} />} onClick={replayScenario} style={{ flexShrink: 0 }}>
              Start
            </Button>
          }
        />
      </Stack>
    </Modal>
  );
}
