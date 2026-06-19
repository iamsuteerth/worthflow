import { Component, type ReactNode } from "react";
import { Button, Center, Stack, Text, Title } from "@mantine/core";
import { IconAlertCircle } from "@tabler/icons-react";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

const PLANNER_STORAGE_KEY = "worth-flow-state-v3";

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <Center h="100vh" p="xl">
          <Stack align="center" gap="md" maw={420}>
            <IconAlertCircle size={48} color="var(--mantine-color-red-6)" />
            <Title order={3} ta="center">Something went wrong</Title>
            <Text size="sm" c="dimmed" ta="center">
              An unexpected error occurred. Try reloading — if the problem
              persists, resetting your local plan usually fixes it.
            </Text>
            <Button onClick={() => window.location.reload()}>Reload</Button>
            <Button
              variant="subtle"
              color="red"
              size="xs"
              onClick={() => {
                localStorage.removeItem(PLANNER_STORAGE_KEY);
                window.location.reload();
              }}
            >
              Reset local plan and reload
            </Button>
          </Stack>
        </Center>
      );
    }

    return this.props.children;
  }
}
