import { createContext } from "react";

export type ColorScheme =
  | "light"
  | "dark";

export interface ThemeContextValue {
  colorScheme: ColorScheme;
  toggleTheme: () => void;
}

export const ThemeContext =
  createContext<ThemeContextValue | null>(
    null
  );