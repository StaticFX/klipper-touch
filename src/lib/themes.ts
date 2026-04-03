export interface ThemeVars {
  background: string;
  foreground: string;
  card: string;
  "card-foreground": string;
  popover: string;
  "popover-foreground": string;
  primary: string;
  "primary-foreground": string;
  secondary: string;
  "secondary-foreground": string;
  muted: string;
  "muted-foreground": string;
  accent: string;
  "accent-foreground": string;
  destructive: string;
  border: string;
  input: string;
  ring: string;
  "chart-1": string;
  "chart-2": string;
  "chart-3": string;
  "chart-4": string;
  "chart-5": string;
  radius: string;
}

export interface CustomTheme {
  id: string;
  name: string;
  light: ThemeVars;
  dark: ThemeVars;
}

export const CUSTOM_THEMES: CustomTheme[] = [
  {
    id: "terminal",
    name: "Terminal",
    light: {
      background: "#000000",
      foreground: "#00FF41",
      card: "#050505",
      "card-foreground": "#00FF41",
      popover: "#000000",
      "popover-foreground": "#00FF41",
      primary: "#00FF41",
      "primary-foreground": "#000000",
      secondary: "#003B00",
      "secondary-foreground": "#00FF41",
      muted: "#001A00",
      "muted-foreground": "#008F11",
      accent: "#00FF41",
      "accent-foreground": "#000000",
      destructive: "#FF0000",
      border: "#003B00",
      input: "#000000",
      ring: "#00FF41",
      "chart-1": "#00FF41",
      "chart-2": "#008F11",
      "chart-3": "#003B00",
      "chart-4": "#0D0208",
      "chart-5": "#00FF41",
      radius: "0rem",
    },
    dark: {
      background: "#000000",
      foreground: "#00FF41",
      card: "#050505",
      "card-foreground": "#00FF41",
      popover: "#000000",
      "popover-foreground": "#00FF41",
      primary: "#00FF41",
      "primary-foreground": "#000000",
      secondary: "#003B00",
      "secondary-foreground": "#00FF41",
      muted: "#001A00",
      "muted-foreground": "#008F11",
      accent: "#00FF41",
      "accent-foreground": "#000000",
      destructive: "#FF0000",
      border: "#003B00",
      input: "#000000",
      ring: "#00FF41",
      "chart-1": "#00FF41",
      "chart-2": "#008F11",
      "chart-3": "#003B00",
      "chart-4": "#0D0208",
      "chart-5": "#00FF41",
      radius: "0rem",
    },
  },
  {
    id: "emerald",
    name: "Emerald",
    light: {
      background: "#ffffff",
      foreground: "#103c1f",
      card: "#ffffff",
      "card-foreground": "#103c1f",
      popover: "#ffffff",
      "popover-foreground": "#103c1f",
      primary: "#30bd2e",
      "primary-foreground": "#ffffff",
      secondary: "#66f06f",
      "secondary-foreground": "#0f8000",
      muted: "#f2f2f2",
      "muted-foreground": "#778d7e",
      accent: "#dbffde",
      "accent-foreground": "#103c1f",
      destructive: "oklch(0.577 0.245 27.325)",
      border: "#f0f0f0",
      input: "oklch(0.922 0 0)",
      ring: "oklch(0.708 0 0)",
      "chart-1": "#3dff7e",
      "chart-2": "#30bb5e",
      "chart-3": "#27904a",
      "chart-4": "#1f703a",
      "chart-5": "#103c1f",
      radius: "1.875rem",
    },
    dark: {
      background: "#000000",
      foreground: "#cdffb8",
      card: "#050b05",
      "card-foreground": "#1c9b25",
      popover: "#092202",
      "popover-foreground": "#f7f7f7",
      primary: "#77c940",
      "primary-foreground": "#14410b",
      secondary: "#1e5809",
      "secondary-foreground": "#77c940",
      muted: "#091f00",
      "muted-foreground": "#c0e8ab",
      accent: "#1f3c0b",
      "accent-foreground": "#ffffff",
      destructive: "oklch(0.704 0.191 22.216)",
      border: "#081802",
      input: "#193d05",
      ring: "#2d6e11",
      "chart-1": "#68df07",
      "chart-2": "#15c118",
      "chart-3": "#297807",
      "chart-4": "#0e5d04",
      "chart-5": "#014200",
      radius: "1.875rem",
    },
  },
  {
    id: "melancholic-mint",
    name: "Melancholic Mint",
    light: {
      background: "hsl(60, 5%, 85%)",
      foreground: "hsl(0, 0%, 15%)",
      card: "hsl(60, 5%, 80%)",
      "card-foreground": "hsl(0, 0%, 10%)",
      popover: "hsl(60, 5%, 85%)",
      "popover-foreground": "hsl(0, 0%, 15%)",
      primary: "hsl(0, 0%, 20%)",
      "primary-foreground": "hsl(60, 5%, 95%)",
      secondary: "hsl(200, 10%, 40%)",
      "secondary-foreground": "hsl(60, 5%, 95%)",
      muted: "hsl(60, 2%, 75%)",
      "muted-foreground": "hsl(0, 0%, 40%)",
      accent: "hsl(35, 20%, 50%)",
      "accent-foreground": "hsl(60, 5%, 10%)",
      destructive: "hsl(0, 50%, 40%)",
      border: "hsl(0, 0%, 60%)",
      input: "hsl(60, 5%, 75%)",
      ring: "hsl(0, 0%, 20%)",
      "chart-1": "hsl(0, 0%, 30%)",
      "chart-2": "hsl(200, 15%, 45%)",
      "chart-3": "hsl(35, 15%, 45%)",
      "chart-4": "hsl(160, 10%, 40%)",
      "chart-5": "hsl(280, 5%, 45%)",
      radius: "0rem",
    },
    dark: {
      background: "hsl(240, 10%, 6%)",
      foreground: "hsl(180, 5%, 70%)",
      card: "hsl(240, 10%, 8%)",
      "card-foreground": "hsl(180, 5%, 80%)",
      popover: "hsl(240, 10%, 5%)",
      "popover-foreground": "hsl(180, 5%, 75%)",
      primary: "hsl(180, 20%, 60%)",
      "primary-foreground": "hsl(240, 20%, 5%)",
      secondary: "hsl(260, 15%, 15%)",
      "secondary-foreground": "hsl(180, 5%, 85%)",
      muted: "hsl(240, 10%, 12%)",
      "muted-foreground": "hsl(240, 5%, 45%)",
      accent: "hsl(280, 20%, 20%)",
      "accent-foreground": "hsl(280, 50%, 80%)",
      destructive: "hsl(0, 60%, 30%)",
      border: "hsl(240, 5%, 15%)",
      input: "hsl(240, 10%, 10%)",
      ring: "hsl(180, 20%, 60%)",
      "chart-1": "hsl(180, 30%, 50%)",
      "chart-2": "hsl(280, 30%, 50%)",
      "chart-3": "hsl(320, 30%, 50%)",
      "chart-4": "hsl(40, 30%, 50%)",
      "chart-5": "hsl(0, 30%, 50%)",
      radius: "0rem",
    },
  },
];
