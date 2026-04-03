import { create } from "zustand";
import { CUSTOM_THEMES, type ThemeVars } from "@/lib/themes";

export type Tab = "dashboard" | "print" | "actions" | "macros" | "settings";
export type Theme = "light" | "dark";
export type EstopStyle = "statusbar" | "floating" | "both";

export interface AccentColor {
  name: string;
  hue: number;
}

export const ACCENT_PRESETS: AccentColor[] = [
  { name: "Blue", hue: 260 },
  { name: "Cyan", hue: 195 },
  { name: "Green", hue: 150 },
  { name: "Yellow", hue: 85 },
  { name: "Orange", hue: 50 },
  { name: "Red", hue: 25 },
  { name: "Pink", hue: 340 },
  { name: "Purple", hue: 300 },
];

interface UiStore {
  activeTab: Tab;
  tabClickCount: number;
  setActiveTab: (tab: Tab) => void;
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  accentHue: number;
  setAccentHue: (hue: number) => void;
  themePreset: string;
  setThemePreset: (id: string) => void;
  hiddenSensors: string[];
  toggleSensor: (key: string) => void;
  estopStyle: EstopStyle;
  setEstopStyle: (style: EstopStyle) => void;
  estopConfirm: boolean;
  setEstopConfirm: (confirm: boolean) => void;
  confirmDialog: ConfirmDialogState | null;
  showConfirm: (state: ConfirmDialogState) => void;
  hideConfirm: () => void;
  printMinimized: boolean;
  setPrintMinimized: (v: boolean) => void;
}

interface ConfirmDialogState {
  title: string;
  message: string;
  imageUrl?: string;
  onConfirm: () => void;
}

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
  localStorage.setItem("klipper-touch-theme", theme);
}

function applyAccentHue(hue: number) {
  const style = document.getElementById("accent-override") ?? (() => {
    const el = document.createElement("style");
    el.id = "accent-override";
    document.head.appendChild(el);
    return el;
  })();
  style.textContent = `
    :root {
      --primary: oklch(0.55 0.2 ${hue});
      --ring: oklch(0.55 0.2 ${hue});
      --chart-1: oklch(0.55 0.2 ${hue});
    }
    .dark {
      --primary: oklch(0.62 0.214 ${hue});
      --ring: oklch(0.62 0.214 ${hue});
      --chart-1: oklch(0.62 0.214 ${hue});
    }
  `;
  localStorage.setItem("klipper-touch-accent-hue", String(hue));
}

function removeAccentOverride() {
  document.getElementById("accent-override")?.remove();
}

function varsToCSS(vars: ThemeVars): string {
  return Object.entries(vars)
    .map(([k, v]) => `  --${k}: ${v};`)
    .join("\n");
}

function applyThemePreset(id: string) {
  const existing = document.getElementById("theme-preset-override");
  // Toggle theme-specific classes
  document.documentElement.classList.toggle("glass-active", id === "glass");
  document.documentElement.classList.toggle("terminal-active", id === "terminal");

  if (id === "default") {
    existing?.remove();
    return;
  }
  const theme = CUSTOM_THEMES.find((t) => t.id === id);
  if (!theme) return;

  const style = existing ?? (() => {
    const el = document.createElement("style");
    el.id = "theme-preset-override";
    document.head.appendChild(el);
    return el;
  })();
  style.textContent = `
:root {
${varsToCSS(theme.light)}
}
.dark {
${varsToCSS(theme.dark)}
}
  `;
  localStorage.setItem("klipper-touch-theme-preset", id);
}

const savedTheme = (typeof localStorage !== "undefined"
  ? localStorage.getItem("klipper-touch-theme")
  : null) as Theme | null;
const initialTheme: Theme = savedTheme || "light";

const savedHue = typeof localStorage !== "undefined"
  ? localStorage.getItem("klipper-touch-accent-hue")
  : null;
const initialHue = savedHue ? Number(savedHue) : 260;

const savedHidden = (typeof localStorage !== "undefined"
  ? localStorage.getItem("klipper-touch-hidden-sensors")
  : null);
const initialHidden: string[] = savedHidden ? JSON.parse(savedHidden) : [];

const savedEstopStyle = (typeof localStorage !== "undefined"
  ? localStorage.getItem("klipper-touch-estop-style")
  : null) as EstopStyle | null;
const initialEstopStyle: EstopStyle = savedEstopStyle || "statusbar";

const savedEstopConfirm = typeof localStorage !== "undefined"
  ? localStorage.getItem("klipper-touch-estop-confirm")
  : null;
const initialEstopConfirm = savedEstopConfirm !== null ? savedEstopConfirm === "true" : true;

const savedPreset = typeof localStorage !== "undefined"
  ? localStorage.getItem("klipper-touch-theme-preset")
  : null;
const initialPreset = savedPreset || "default";

// Apply on load
if (typeof document !== "undefined") {
  document.documentElement.classList.toggle("dark", initialTheme === "dark");
  if (initialPreset !== "default") {
    applyThemePreset(initialPreset);
  } else if (initialHue !== 260) {
    applyAccentHue(initialHue);
  }
}

export const useUiStore = create<UiStore>((set, get) => ({
  activeTab: "dashboard",
  tabClickCount: 0,
  setActiveTab: (tab) => set((s) => ({ activeTab: tab, tabClickCount: s.tabClickCount + 1 })),
  theme: initialTheme,
  setTheme: (theme) => {
    applyTheme(theme);
    set({ theme });
  },
  toggleTheme: () => {
    const next = get().theme === "light" ? "dark" : "light";
    applyTheme(next);
    set({ theme: next });
  },
  accentHue: initialHue,
  setAccentHue: (hue) => {
    applyAccentHue(hue);
    set({ accentHue: hue });
  },
  themePreset: initialPreset,
  setThemePreset: (id) => {
    if (id === "default") {
      // Switching back to default — remove theme override, restore accent hue
      applyThemePreset("default");
      localStorage.setItem("klipper-touch-theme-preset", "default");
      applyAccentHue(get().accentHue);
    } else {
      // Custom theme — remove accent override since theme controls all colors
      removeAccentOverride();
      applyThemePreset(id);
      localStorage.setItem("klipper-touch-theme-preset", id);
    }
    set({ themePreset: id });
  },
  hiddenSensors: initialHidden,
  toggleSensor: (key) => {
    const current = get().hiddenSensors;
    const next = current.includes(key)
      ? current.filter((k) => k !== key)
      : [...current, key];
    localStorage.setItem("klipper-touch-hidden-sensors", JSON.stringify(next));
    set({ hiddenSensors: next });
  },
  estopStyle: initialEstopStyle,
  setEstopStyle: (style) => {
    localStorage.setItem("klipper-touch-estop-style", style);
    set({ estopStyle: style });
  },
  estopConfirm: initialEstopConfirm,
  setEstopConfirm: (confirm) => {
    localStorage.setItem("klipper-touch-estop-confirm", String(confirm));
    set({ estopConfirm: confirm });
  },
  confirmDialog: null,
  showConfirm: (state) => set({ confirmDialog: state }),
  hideConfirm: () => set({ confirmDialog: null }),
  printMinimized: false,
  setPrintMinimized: (v) => set({ printMinimized: v }),
}));
