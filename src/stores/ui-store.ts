import { create } from "zustand";

export type Tab = "dashboard" | "print" | "actions" | "macros" | "settings";
export type Theme = "light" | "dark";

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
  hiddenSensors: string[];
  toggleSensor: (key: string) => void;
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
  const root = document.documentElement;
  // Light mode values
  root.style.setProperty("--primary", `oklch(0.55 0.2 ${hue})`);
  root.style.setProperty("--ring", `oklch(0.55 0.2 ${hue})`);
  root.style.setProperty("--chart-1", `oklch(0.55 0.2 ${hue})`);
  // Dark mode needs separate handling via a CSS class, but since we use
  // CSS custom properties on :root, we apply the dark variant too.
  // The .dark selector overrides will be set via a <style> tag.
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

// Apply on load
if (typeof document !== "undefined") {
  document.documentElement.classList.toggle("dark", initialTheme === "dark");
  if (initialHue !== 260) applyAccentHue(initialHue);
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
  hiddenSensors: initialHidden,
  toggleSensor: (key) => {
    const current = get().hiddenSensors;
    const next = current.includes(key)
      ? current.filter((k) => k !== key)
      : [...current, key];
    localStorage.setItem("klipper-touch-hidden-sensors", JSON.stringify(next));
    set({ hiddenSensors: next });
  },
  confirmDialog: null,
  showConfirm: (state) => set({ confirmDialog: state }),
  hideConfirm: () => set({ confirmDialog: null }),
  printMinimized: false,
  setPrintMinimized: (v) => set({ printMinimized: v }),
}));
