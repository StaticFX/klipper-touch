import { create } from "zustand";

interface KeyboardStore {
  visible: boolean;
  height: number;
  target: HTMLInputElement | HTMLTextAreaElement | null;
  show: (el: HTMLInputElement | HTMLTextAreaElement) => void;
  hide: () => void;
  setHeight: (h: number) => void;
}

export const useKeyboardStore = create<KeyboardStore>((set) => ({
  visible: false,
  height: 0,
  target: null,
  show: (el) => set({ visible: true, target: el }),
  hide: () => set({ visible: false, target: null }),
  setHeight: (h) => set({ height: h }),
}));
