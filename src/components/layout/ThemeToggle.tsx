// src/components/layout/ThemeToggle.tsx
import {
  ActionIcon,
} from "@mantine/core";

import {
  useLocalStorage,
} from "@mantine/hooks";

import {
  IconMoon,
  IconSun,
} from "@tabler/icons-react";

export default function ThemeToggle() {
  const [
    colorScheme,
    setColorScheme,
  ] = useLocalStorage<
    "light" | "dark"
  >({
    key:
      "finance-planner-theme",

    defaultValue:
      "dark",
  });

  const toggleTheme =
    () => {
      setColorScheme(
        colorScheme ===
          "dark"
          ? "light"
          : "dark"
      );
    };

  return (
    <ActionIcon
      size="lg"
      radius="xl"
      variant="light"
      onClick={
        toggleTheme
      }
    >
      {colorScheme ===
      "dark" ? (
        <IconSun
          size={18}
        />
      ) : (
        <IconMoon
          size={18}
        />
      )}
    </ActionIcon>
  );
}