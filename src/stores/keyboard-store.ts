import { create } from "zustand";

interface KeyboardStore {
  visible: boolean;
  target: HTMLInputElement | HTMLTextAreaElement | null;
  show: (el: HTMLInputElement | HTMLTextAreaElement) => void;
  hide: () => void;
}

export const useKeyboardStore = create<KeyboardStore>((set) => ({
  visible: false,
  target: null,
  show: (el) => set({ visible: true, target: el }),
  hide: () => set({ visible: false, target: null }),
}));
