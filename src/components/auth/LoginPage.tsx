import type { TablerIcon } from "@tabler/icons-react";

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
import AppFooter from "@/components/layout/AppFooter";
import { isValidEmail, isValidPassword, PASSWORD_HINT } from "@/lib/validation";

type AuthView = "signIn" | "signUp" | "confirmSignUp" | "forgotPassword" | "resetPassword";

function ViewHeader({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: TablerIcon;
  title: string;
  subtitle?: string;
}) {
  return (
    <Stack gap="sm" align="center">
      <ThemeIcon size={56} radius="xl" variant="light" color="brand">
        <Icon size={28} />
      </ThemeIcon>
      <Title order={2} ta="center">{title}</Title>
      {subtitle && <Text ta="center" c="dimmed" size="sm">{subtitle}</Text>}
    </Stack>
  );
}

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
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("UserNotConfirmedException")) {
        setPendingEmail(email);
        navigate("confirmSignUp");
        await resendSignUpCode(email);
      } else {
        setError("Invalid email or password.");
      }
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
        try {
          await resendSignUpCode(signUpEmail);
          setPendingEmail(signUpEmail);
          navigate("confirmSignUp");
          notifications.show({
            message: "This email has a pending sign-up. We re-sent your code.",
            color: "brand",
          });
        } catch {
          setError("An account with this email already exists. Please sign in.");
        }
      } else if (msg.includes("InvalidPasswordException")) {
        setError("Password must be 8+ characters with uppercase, lowercase, and a number.");
      } else if (msg.includes("InvalidParameterException")) {
        setError("Please enter a valid email address.");
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
      const verifiedEmail = pendingEmail;
      await confirmSignUp(pendingEmail, code);
      notifications.show({ message: "Email verified. Please sign in.", color: "teal" });
      navigate("signIn");
      setEmail(verifiedEmail);
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
        <Stack gap="lg" component="form" onSubmit={(e) => { e.preventDefault(); handleSignIn(); }}>
          <ViewHeader icon={IconLock} title="Worth Flow" subtitle="Sign in to continue" />
          {error && <Alert color="red" radius="md">{error}</Alert>}
          <Stack gap="sm">
            <TextInput
              placeholder="Email"
              value={email}
              onChange={(e) => { setEmail(e.currentTarget.value); clearError(); }}
              type="email"
              autoComplete="email"
              autoFocus
            />
            <PasswordInput
              placeholder="Password"
              value={password}
              onChange={(e) => { setPassword(e.currentTarget.value); clearError(); }}
              autoComplete="current-password"
            />
          </Stack>
          <Button
            fullWidth
            type="submit"
            loading={loading}
            disabled={!isValidEmail(email) || !password}
          >
            Sign In
          </Button>
          <Group justify="space-between">
            <Anchor component="button" type="button" size="sm" onClick={() => navigate("forgotPassword")}>
              Forgot password?
            </Anchor>
            <Anchor component="button" type="button" size="sm" onClick={() => navigate("signUp")}>
              Create account
            </Anchor>
          </Group>
        </Stack>
      );
    }

    if (view === "signUp") {
      const emailValid = isValidEmail(signUpEmail);
      const passwordValid = isValidPassword(signUpPassword);
      const passwordsMatch = signUpPassword === confirmPassword;
      return (
        <Stack gap="lg" component="form" onSubmit={(e) => { e.preventDefault(); handleSignUp(); }}>
          <ViewHeader icon={IconUserPlus} title="Create Account" />
          {error && <Alert color="red" radius="md">{error}</Alert>}
          <Stack gap="sm">
            <TextInput
              placeholder="Email"
              value={signUpEmail}
              onChange={(e) => { setSignUpEmail(e.currentTarget.value); clearError(); }}
              type="email"
              autoComplete="email"
              autoFocus
            />
            <PasswordInput
              placeholder="Password"
              value={signUpPassword}
              onChange={(e) => { setSignUpPassword(e.currentTarget.value); clearError(); }}
              description={PASSWORD_HINT}
              autoComplete="new-password"
              error={signUpPassword && !passwordValid ? PASSWORD_HINT : undefined}
            />
            <PasswordInput
              placeholder="Confirm Password"
              value={confirmPassword}
              onChange={(e) => { setConfirmPassword(e.currentTarget.value); clearError(); }}
              autoComplete="new-password"
              error={confirmPassword && !passwordsMatch ? "Passwords do not match." : undefined}
            />
          </Stack>
          <Button
            fullWidth
            type="submit"
            loading={loading}
            disabled={!emailValid || !passwordValid || !passwordsMatch}
          >
            Create Account
          </Button>
          <Group justify="center">
            <Anchor component="button" type="button" size="sm" onClick={() => navigate("signIn")}>
              Already have an account? Sign in
            </Anchor>
          </Group>
        </Stack>
      );
    }

    if (view === "confirmSignUp") {
      return (
        <Stack gap="lg" component="form" onSubmit={(e) => { e.preventDefault(); handleConfirmSignUp(); }}>
          <ViewHeader
            icon={IconMailCheck}
            title="Verify your email"
            subtitle={`We sent a 6-digit code to ${pendingEmail}`}
          />
          {error && <Alert color="red" radius="md">{error}</Alert>}
          <TextInput
            placeholder="6-digit code"
            value={code}
            onChange={(e) => { setCode(e.currentTarget.value); clearError(); }}
            maxLength={6}
            inputMode="numeric"
            autoComplete="one-time-code"
            autoFocus
          />
          <Button
            fullWidth
            type="submit"
            loading={loading}
            disabled={code.length < 6}
          >
            Verify
          </Button>
          <Group justify="space-between">
            <Anchor component="button" type="button" size="sm" onClick={handleResendCode}>
              Resend code
            </Anchor>
            <Anchor component="button" type="button" size="sm" c="dimmed" onClick={() => navigate("signUp")}>
              Cancel
            </Anchor>
          </Group>
        </Stack>
      );
    }

    if (view === "forgotPassword") {
      const emailValid = isValidEmail(forgotEmail);
      return (
        <Stack gap="lg" component="form" onSubmit={(e) => { e.preventDefault(); handleForgotPassword(); }}>
          <ViewHeader
            icon={IconKey}
            title="Reset password"
            subtitle="Enter your email and we'll send a reset code."
          />
          {error && <Alert color="red" radius="md">{error}</Alert>}
          <TextInput
            placeholder="Email"
            value={forgotEmail}
            onChange={(e) => { setForgotEmail(e.currentTarget.value); clearError(); }}
            type="email"
            autoComplete="email"
            autoFocus
          />
          <Button
            fullWidth
            type="submit"
            loading={loading}
            disabled={!emailValid}
          >
            Send Reset Code
          </Button>
          <Group justify="center">
            <Anchor component="button" type="button" size="sm" onClick={() => navigate("signIn")}>
              Back to sign in
            </Anchor>
          </Group>
        </Stack>
      );
    }

    if (view === "resetPassword") {
      const passwordValid = isValidPassword(newPassword);
      const passwordsMatch = newPassword === confirmNewPassword;
      return (
        <Stack gap="lg" component="form" onSubmit={(e) => { e.preventDefault(); handleResetPassword(); }}>
          <ViewHeader
            icon={IconKey}
            title="Set new password"
            subtitle={`Enter the code sent to ${pendingEmail}`}
          />
          {error && <Alert color="red" radius="md">{error}</Alert>}
          <Stack gap="sm">
            <TextInput
              placeholder="Reset code"
              value={resetCode}
              onChange={(e) => { setResetCode(e.currentTarget.value); clearError(); }}
              maxLength={6}
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus
            />
            <PasswordInput
              placeholder="New password"
              value={newPassword}
              onChange={(e) => { setNewPassword(e.currentTarget.value); clearError(); }}
              description={PASSWORD_HINT}
              autoComplete="new-password"
              error={newPassword && !passwordValid ? PASSWORD_HINT : undefined}
            />
            <PasswordInput
              placeholder="Confirm new password"
              value={confirmNewPassword}
              onChange={(e) => { setConfirmNewPassword(e.currentTarget.value); clearError(); }}
              autoComplete="new-password"
              error={confirmNewPassword && !passwordsMatch ? "Passwords do not match." : undefined}
            />
          </Stack>
          <Button
            fullWidth
            type="submit"
            loading={loading}
            disabled={resetCode.length < 6 || !passwordValid || !passwordsMatch}
          >
            Reset Password
          </Button>
          <Group justify="center">
            <Anchor component="button" type="button" size="sm" onClick={() => navigate("signIn")}>
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
      <Stack h="100vh" justify="space-between" p="md">
        <Center style={{ flex: 1 }}>
          <Card shadow="md" radius="lg" withBorder maw={400} w="100%">
            {renderView()}
          </Card>
        </Center>
        <AppFooter />
      </Stack>
    </>
  );
}
