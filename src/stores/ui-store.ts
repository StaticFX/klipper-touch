import { create } from "zustand";

export type Tab = "dashboard" | "print" | "actions" | "macros" | "console" | "settings";
export type Theme = "light" | "dark";

interface UiStore {
  activeTab: Tab;
  tabClickCount: number;
  setActiveTab: (tab: Tab) => void;
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  hiddenSensors: string[];
  toggleSensor: (key: string) => void;
  confirmDialog: ConfirmDialogState | null;
  showConfirm: (state: ConfirmDialogState) => void;
  hideConfirm: () => void;
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

const savedTheme = (typeof localStorage !== "undefined"
  ? localStorage.getItem("klipper-touch-theme")
  : null) as Theme | null;
const initialTheme: Theme = savedTheme || "light";

const savedHidden = (typeof localStorage !== "undefined"
  ? localStorage.getItem("klipper-touch-hidden-sensors")
  : null);
const initialHidden: string[] = savedHidden ? JSON.parse(savedHidden) : [];
// Apply on load
if (typeof document !== "undefined") {
  document.documentElement.classList.toggle("dark", initialTheme === "dark");
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
}));
