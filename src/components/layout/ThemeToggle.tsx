import { ActionIcon } from "@mantine/core";
import { IconMoon, IconSun } from "@tabler/icons-react";

import { useTheme } from "@/app/useTheme";

export default function ThemeToggle() {
  const { colorScheme, toggleTheme } = useTheme();

  return (
    <ActionIcon size="lg" radius="md" variant="subtle" onClick={toggleTheme} aria-label="Toggle color scheme">
      {colorScheme === "dark" ? <IconSun size={18} /> : <IconMoon size={18} />}
    </ActionIcon>
  );
}
