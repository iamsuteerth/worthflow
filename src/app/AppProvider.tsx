import { type ReactNode } from "react";
import { MantineProvider } from "@mantine/core";
import { useLocalStorage } from "@mantine/hooks";
import { Notifications } from "@mantine/notifications";

import { ThemeContext, type ColorScheme } from "@/app/theme-context";
import { theme } from "@/theme/theme";

export function AppProvider({ children }: { children: ReactNode }) {
  const [colorScheme, setColorScheme] = useLocalStorage<ColorScheme>({
    key: "worth-flow-theme",
    defaultValue: "light",
  });

  const toggleTheme = () => {
    setColorScheme((current) => (current === "dark" ? "light" : "dark"));
  };

  return (
    <ThemeContext.Provider value={{ colorScheme, toggleTheme }}>
      <MantineProvider theme={theme} forceColorScheme={colorScheme}>
        <Notifications />
        {children}
      </MantineProvider>
    </ThemeContext.Provider>
  );
}
