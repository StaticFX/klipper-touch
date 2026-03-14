import { create } from "zustand";

export type Tab = "dashboard" | "print" | "actions" | "macros" | "settings";
export type Theme = "light" | "dark";

interface UiStore {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
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
// Apply on load
if (typeof document !== "undefined") {
  document.documentElement.classList.toggle("dark", initialTheme === "dark");
}

export const useUiStore = create<UiStore>((set, get) => ({
  activeTab: "dashboard",
  setActiveTab: (tab) => set({ activeTab: tab }),
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
  confirmDialog: null,
  showConfirm: (state) => set({ confirmDialog: state }),
  hideConfirm: () => set({ confirmDialog: null }),
}));
