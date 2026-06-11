import {
  type ReactNode,
} from "react";

import {
  MantineProvider,
} from "@mantine/core";

import {
  useLocalStorage,
} from "@mantine/hooks";

import {
  ThemeContext,
  type ColorScheme,
} from "./theme-context";

export function AppProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [
    colorScheme,
    setColorScheme,
  ] = useLocalStorage<ColorScheme>({
    key: "finance-planner-theme",
    defaultValue: "light",
  });

  const toggleTheme = () => {
    setColorScheme((current) =>
      current === "dark"
        ? "light"
        : "dark"
    );
  };

  return (
    <ThemeContext.Provider
      value={{
        colorScheme,
        toggleTheme,
      }}
    >
      <MantineProvider
        forceColorScheme={
          colorScheme
        }
      >
        {children}
      </MantineProvider>
    </ThemeContext.Provider>
  );
}
