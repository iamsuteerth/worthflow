import {
  Alert,
  Button,
  Card,
  Center,
  PasswordInput,
  Stack,
  Text,
  Title,
  ThemeIcon,
} from "@mantine/core";
import { IconLock } from "@tabler/icons-react";
import { useState } from "react";
import { useAuthStore } from "@/store/authStore";

export default function LoginPage() {
  const login = useAuthStore((state) => state.login);
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);

  const attempt = () => {
    const success = login(password);
    setError(!success);
  };

  return (
    <Center h="100vh" p="md">
      <Card shadow="md" radius="lg" withBorder maw={400} w="100%">
        <Stack gap="lg">
          <Stack gap="sm" align="center">
            <ThemeIcon size={56} radius="xl" variant="light" color="brand">
              <IconLock size={28} />
            </ThemeIcon>
            <Title order={2} ta="center">Finance Planner</Title>
            <Text ta="center" c="dimmed" size="sm">
              Enter your password to continue
            </Text>
          </Stack>

          {error && (
            <Alert color="red" radius="md">Invalid password. Please try again.</Alert>
          )}

          <PasswordInput
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.currentTarget.value)}
            onKeyDown={(e) => e.key === "Enter" && attempt()}
            autoFocus
          />

          <Button fullWidth onClick={attempt}>
            Unlock
          </Button>
        </Stack>
      </Card>
    </Center>
  );
}
