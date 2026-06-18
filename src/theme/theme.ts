import { createTheme, type MantineColorsTuple } from "@mantine/core";

const brand: MantineColorsTuple = [
  "#eef2ff",
  "#e0e7ff",
  "#c7d2fe",
  "#a5b4fc",
  "#818cf8",
  "#6366f1",
  "#4f46e5",
  "#4338ca",
  "#3730a3",
  "#312e81",
];

// Material Design dark theme: #121212 base, neutral elevation model,
// 87%/60% white text tiers, lighter primary (brand[3]) for legibility on dark surfaces.
const dark: MantineColorsTuple = [
  "#e2e2e2",  // 0 — primary text (~87% white)
  "#a0a0a0",  // 1 — medium emphasis (~60% white)
  "#737373",  // 2 — icons / placeholder
  "#5c5c5c",  // 3 — disabled (~38% white)
  "#383838",  // 4 — dividers / borders (12% white)
  "#2c2c2c",  // 5 — elevated surface (8dp)
  "#1e1e1e",  // 6 — surface / cards (1–2dp)
  "#121212",  // 7 — base background (MD baseline)
  "#0d0d0d",  // 8
  "#080808",  // 9
];

export const theme = createTheme({
  primaryColor: "brand",
  primaryShade: { light: 6, dark: 3 },
  defaultRadius: "lg",

  fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif',
  headings: {
    fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif',
    fontWeight: "700",
  },

  radius: {
    xs: "4px",
    sm: "8px",
    md: "10px",
    lg: "14px",
    xl: "20px",
  },

  colors: { brand, dark },

  components: {
    Card: {
      defaultProps: {
        radius: "lg",
        shadow: "sm",
      },
    },
    Modal: {
      defaultProps: {
        radius: "lg",
      },
    },
    Drawer: {
      defaultProps: {
        radius: "lg",
      },
    },
    Paper: {
      defaultProps: {
        radius: "lg",
      },
    },
    Badge: {
      defaultProps: {
        radius: "xl",
      },
    },
    Button: {
      defaultProps: {
        radius: "md",
      },
    },
    ActionIcon: {
      defaultProps: {
        radius: "md",
      },
    },
    Input: {
      styles: {
        input: { fontSize: "16px" },
      },
    },
    TextInput: {
      styles: {
        input: { fontSize: "16px" },
      },
    },
    PasswordInput: {
      styles: {
        input: { fontSize: "16px" },
      },
    },
    NumberInput: {
      styles: {
        input: { fontSize: "16px" },
      },
    },
    Select: {
      styles: {
        input: { fontSize: "16px" },
      },
    },
    Notification: {
      defaultProps: {
        radius: "lg",
      },
    },
  },

  other: {
    semantic: {
      positive: "teal",
      negative: "red",
      neutral: "gray",
      investment: "violet",
      instrumentFd: "cyan",
      instrumentRd: "grape",
      warning: "yellow",
      brand: "brand",
    } as const,
  },
});
