import { Anchor, Group, Text } from "@mantine/core";
import { IconBrandGithub, IconBrandLinkedin, IconHeartFilled } from "@tabler/icons-react";

export default function AppFooter() {
  return (
    <Group
      id="app-footer"
      justify="space-between"
      wrap="wrap"
      gap="xs"
      py="md"
      px="md"
      mt="xl"
      style={{ borderTop: "1px solid var(--mantine-color-default-border)" }}
    >
      <Text size="xs" c="dimmed">
        Made with{" "}
        <IconHeartFilled
          size={11}
          style={{ color: "var(--mantine-color-red-6)", verticalAlign: "middle" }}
        />{" "}
        by Suteerth &middot; &copy; {new Date().getFullYear()} Worth Flow
      </Text>
      <Group gap="md">
        <Anchor
          href="https://github.com/iamsuteerth"
          target="_blank"
          rel="noopener noreferrer me"
          c="dimmed"
          size="xs"
          aria-label="GitHub"
        >
          <IconBrandGithub size={16} />
        </Anchor>
        <Anchor
          href="https://www.linkedin.com/in/suteerth-subramaniam/"
          target="_blank"
          rel="noopener noreferrer me"
          c="dimmed"
          size="xs"
          aria-label="LinkedIn"
        >
          <IconBrandLinkedin size={16} />
        </Anchor>
        <Anchor href="/about" c="dimmed" size="xs">
          About
        </Anchor>
        <Anchor href="/privacy" c="dimmed" size="xs">
          Privacy
        </Anchor>
        <Anchor href="/terms" c="dimmed" size="xs">
          Terms
        </Anchor>
        <Anchor href="/security" c="dimmed" size="xs">
          Security
        </Anchor>
      </Group>
    </Group>
  );
}
