import {
  Alert,
  Anchor,
  Box,
  Button,
  Card,
  Center,
  Group,
  PasswordInput,
  Stack,
  Text,
  TextInput,
  ThemeIcon,
  Title,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconKey, IconLock, IconMailCheck, IconUserPlus } from "@tabler/icons-react";
import { useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { authService } from "@/lib/auth";
import ThemeToggle from "@/components/layout/ThemeToggle";

type AuthView = "signIn" | "signUp" | "confirmSignUp" | "forgotPassword" | "resetPassword";

export default function LoginPage() {
  const [view, setView] = useState<AuthView>("signIn");
  const [pendingEmail, setPendingEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [signUpEmail, setSignUpEmail] = useState("");
  const [signUpPassword, setSignUpPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [code, setCode] = useState("");

  const [forgotEmail, setForgotEmail] = useState("");

  const [resetCode, setResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");

  const signIn = useAuthStore((state) => state.signIn);
  const signUp = useAuthStore((state) => state.signUp);
  const confirmSignUp = useAuthStore((state) => state.confirmSignUp);
  const resendSignUpCode = useAuthStore((state) => state.resendSignUpCode);

  const clearError = () => setError("");

  const navigate = (v: AuthView) => {
    setError("");
    setEmail("");
    setPassword("");
    setSignUpEmail("");
    setSignUpPassword("");
    setConfirmPassword("");
    setCode("");
    setForgotEmail("");
    setResetCode("");
    setNewPassword("");
    setConfirmNewPassword("");
    setView(v);
  };

  async function handleSignIn() {
    setLoading(true);
    setError("");
    try {
      await signIn(email, password);
    } catch {
      setError("Invalid email or password.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSignUp() {
    if (signUpPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await signUp(signUpEmail, signUpPassword);
      setPendingEmail(signUpEmail);
      navigate("confirmSignUp");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("UsernameExistsException") || msg.includes("already exists")) {
        setError("An account with this email already exists.");
      } else {
        setError("Sign up failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirmSignUp() {
    setLoading(true);
    setError("");
    try {
      await confirmSignUp(pendingEmail, code);
      notifications.show({ message: "Email verified. Please sign in.", color: "teal" });
      navigate("signIn");
    } catch {
      setError("Invalid or expired code.");
    } finally {
      setLoading(false);
    }
  }

  async function handleResendCode() {
    try {
      await resendSignUpCode(pendingEmail);
      notifications.show({ message: "Code resent.", color: "brand" });
    } catch {
      // silent
    }
  }

  async function handleForgotPassword() {
    setLoading(true);
    setError("");
    try {
      await authService.resetPassword(forgotEmail);
    } catch {
      // Don't reveal whether email exists
    } finally {
      setPendingEmail(forgotEmail);
      navigate("resetPassword");
      setLoading(false);
    }
  }

  async function handleResetPassword() {
    if (newPassword !== confirmNewPassword) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await authService.confirmResetPassword(pendingEmail, resetCode, newPassword);
      notifications.show({ message: "Password reset successfully.", color: "teal" });
      navigate("signIn");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("InvalidPasswordException")) {
        setError("Password does not meet requirements.");
      } else {
        setError("Invalid or expired code.");
      }
    } finally {
      setLoading(false);
    }
  }

  const renderView = () => {
    if (view === "signIn") {
      return (
        <Stack gap="lg">
          <Stack gap="sm" align="center">
            <ThemeIcon size={56} radius="xl" variant="light" color="brand">
              <IconLock size={28} />
            </ThemeIcon>
            <Title order={2} ta="center">Worth Flow</Title>
            <Text ta="center" c="dimmed" size="sm">Sign in to continue</Text>
          </Stack>

          {error && <Alert color="red" radius="md">{error}</Alert>}

          <Stack gap="sm">
            <TextInput
              placeholder="Email"
              value={email}
              onChange={(e) => { setEmail(e.currentTarget.value); clearError(); }}
              onKeyDown={(e) => e.key === "Enter" && handleSignIn()}
              type="email"
              autoFocus
            />
            <PasswordInput
              placeholder="Password"
              value={password}
              onChange={(e) => { setPassword(e.currentTarget.value); clearError(); }}
              onKeyDown={(e) => e.key === "Enter" && handleSignIn()}
            />
          </Stack>

          <Button fullWidth onClick={handleSignIn} loading={loading}>Sign In</Button>

          <Group justify="space-between">
            <Anchor size="sm" onClick={() => navigate("forgotPassword")} style={{ cursor: "pointer" }}>
              Forgot password?
            </Anchor>
            <Anchor size="sm" onClick={() => navigate("signUp")} style={{ cursor: "pointer" }}>
              Create account
            </Anchor>
          </Group>
        </Stack>
      );
    }

    if (view === "signUp") {
      return (
        <Stack gap="lg">
          <Stack gap="sm" align="center">
            <ThemeIcon size={56} radius="xl" variant="light" color="brand">
              <IconUserPlus size={28} />
            </ThemeIcon>
            <Title order={2} ta="center">Create Account</Title>
          </Stack>

          {error && <Alert color="red" radius="md">{error}</Alert>}

          <Stack gap="sm">
            <TextInput
              placeholder="Email"
              value={signUpEmail}
              onChange={(e) => { setSignUpEmail(e.currentTarget.value); clearError(); }}
              type="email"
              autoFocus
            />
            <PasswordInput
              placeholder="Password"
              value={signUpPassword}
              onChange={(e) => { setSignUpPassword(e.currentTarget.value); clearError(); }}
            />
            <PasswordInput
              placeholder="Confirm Password"
              value={confirmPassword}
              onChange={(e) => { setConfirmPassword(e.currentTarget.value); clearError(); }}
              onKeyDown={(e) => e.key === "Enter" && handleSignUp()}
            />
          </Stack>

          <Button fullWidth onClick={handleSignUp} loading={loading}>Create Account</Button>

          <Group justify="center">
            <Anchor size="sm" onClick={() => navigate("signIn")} style={{ cursor: "pointer" }}>
              Already have an account? Sign in
            </Anchor>
          </Group>
        </Stack>
      );
    }

    if (view === "confirmSignUp") {
      return (
        <Stack gap="lg">
          <Stack gap="sm" align="center">
            <ThemeIcon size={56} radius="xl" variant="light" color="brand">
              <IconMailCheck size={28} />
            </ThemeIcon>
            <Title order={2} ta="center">Verify your email</Title>
            <Text size="sm" c="dimmed" ta="center">
              We sent a 6-digit code to <strong>{pendingEmail}</strong>
            </Text>
          </Stack>

          {error && <Alert color="red" radius="md">{error}</Alert>}

          <TextInput
            placeholder="6-digit code"
            value={code}
            onChange={(e) => { setCode(e.currentTarget.value); clearError(); }}
            onKeyDown={(e) => e.key === "Enter" && handleConfirmSignUp()}
            maxLength={6}
            inputMode="numeric"
            autoFocus
          />

          <Button fullWidth onClick={handleConfirmSignUp} loading={loading}>Verify</Button>

          <Group justify="center">
            <Anchor size="sm" onClick={handleResendCode} style={{ cursor: "pointer" }}>
              Resend code
            </Anchor>
          </Group>
        </Stack>
      );
    }

    if (view === "forgotPassword") {
      return (
        <Stack gap="lg">
          <Stack gap="sm" align="center">
            <ThemeIcon size={56} radius="xl" variant="light" color="brand">
              <IconKey size={28} />
            </ThemeIcon>
            <Title order={2} ta="center">Reset password</Title>
            <Text size="sm" c="dimmed" ta="center">
              Enter your email and we'll send a reset code.
            </Text>
          </Stack>

          {error && <Alert color="red" radius="md">{error}</Alert>}

          <TextInput
            placeholder="Email"
            value={forgotEmail}
            onChange={(e) => { setForgotEmail(e.currentTarget.value); clearError(); }}
            onKeyDown={(e) => e.key === "Enter" && handleForgotPassword()}
            type="email"
            autoFocus
          />

          <Button fullWidth onClick={handleForgotPassword} loading={loading}>Send Reset Code</Button>

          <Group justify="center">
            <Anchor size="sm" onClick={() => navigate("signIn")} style={{ cursor: "pointer" }}>
              Back to sign in
            </Anchor>
          </Group>
        </Stack>
      );
    }

    if (view === "resetPassword") {
      return (
        <Stack gap="lg">
          <Stack gap="sm" align="center">
            <ThemeIcon size={56} radius="xl" variant="light" color="brand">
              <IconKey size={28} />
            </ThemeIcon>
            <Title order={2} ta="center">Set new password</Title>
            <Text size="sm" c="dimmed" ta="center">
              Enter the code sent to <strong>{pendingEmail}</strong>
            </Text>
          </Stack>

          {error && <Alert color="red" radius="md">{error}</Alert>}

          <Stack gap="sm">
            <TextInput
              placeholder="Reset code"
              value={resetCode}
              onChange={(e) => { setResetCode(e.currentTarget.value); clearError(); }}
              maxLength={6}
              inputMode="numeric"
              autoFocus
            />
            <PasswordInput
              placeholder="New password"
              value={newPassword}
              onChange={(e) => { setNewPassword(e.currentTarget.value); clearError(); }}
            />
            <PasswordInput
              placeholder="Confirm new password"
              value={confirmNewPassword}
              onChange={(e) => { setConfirmNewPassword(e.currentTarget.value); clearError(); }}
              onKeyDown={(e) => e.key === "Enter" && handleResetPassword()}
            />
          </Stack>

          <Button fullWidth onClick={handleResetPassword} loading={loading}>Reset Password</Button>

          <Group justify="center">
            <Anchor size="sm" onClick={() => navigate("signIn")} style={{ cursor: "pointer" }}>
              Back to sign in
            </Anchor>
          </Group>
        </Stack>
      );
    }

    return null;
  };

  return (
    <>
      <Box pos="fixed" top={16} right={16} style={{ zIndex: 100 }}>
        <ThemeToggle />
      </Box>
      <Center h="100vh" p="md">
        <Card shadow="md" radius="lg" withBorder maw={400} w="100%">
          {renderView()}
        </Card>
      </Center>
    </>
  );
}
