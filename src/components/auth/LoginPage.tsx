import {
  Alert,
  Button,
  Card,
  Center,
  PasswordInput,
  Stack,
  Text,
  Title,
} from "@mantine/core";

import {
  IconLock,
} from "@tabler/icons-react";

import {
  useState,
} from "react";

import {
  useAuthStore,
} from "@/store/authStore";

export default function LoginPage() {
  const login =
    useAuthStore(
      (state) =>
        state.login
    );

  const [
    password,
    setPassword,
  ] = useState("");

  const [
    error,
    setError,
  ] = useState(false);

  return (
    <Center h="100vh">
      <Card
        shadow="md"
        radius="lg"
        withBorder
        maw={420}
        w="100%"
      >
        <Stack>
          <Center>
            <IconLock
              size={48}
            />
          </Center>

          <Title
            order={2}
            ta="center"
          >
            Finance Planner
          </Title>

          <Text
            ta="center"
            c="dimmed"
          >
            Enter password to continue
          </Text>

          {error && (
            <Alert
              color="red"
            >
              Invalid password
            </Alert>
          )}

          <PasswordInput
            value={password}
            onChange={(e) =>
              setPassword(
                e.currentTarget
                  .value
              )
            }
            onKeyDown={(
              e
            ) => {
              if (
                e.key ===
                "Enter"
              ) {
                const success =
                  login(
                    password
                  );

                setError(
                  !success
                );
              }
            }}
          />

          <Button
            fullWidth
            onClick={() => {
              const success =
                login(
                  password
                );

              setError(
                !success
              );
            }}
          >
            Unlock
          </Button>
        </Stack>
      </Card>
    </Center>
  );
}