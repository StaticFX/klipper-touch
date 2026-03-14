import { create } from "zustand";

const STORAGE_KEY = "klipper-touch-movement";

interface MovementSettings {
  invertX: boolean;
  invertY: boolean;
  invertZ: boolean;
  defaultXySpeed: number; // mm/s
  defaultZSpeed: number;  // mm/s
}

interface MovementStore extends MovementSettings {
  setInvertX: (v: boolean) => void;
  setInvertY: (v: boolean) => void;
  setInvertZ: (v: boolean) => void;
  setDefaultXySpeed: (v: number) => void;
  setDefaultZSpeed: (v: number) => void;
}

function load(): Partial<MovementSettings> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function save(state: MovementSettings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    invertX: state.invertX,
    invertY: state.invertY,
    invertZ: state.invertZ,
    defaultXySpeed: state.defaultXySpeed,
    defaultZSpeed: state.defaultZSpeed,
  }));
}

const saved = load();

export const useMovementStore = create<MovementStore>((set, get) => ({
  invertX: saved.invertX ?? false,
  invertY: saved.invertY ?? false,
  invertZ: saved.invertZ ?? false,
  defaultXySpeed: saved.defaultXySpeed ?? 100,
  defaultZSpeed: saved.defaultZSpeed ?? 10,

  setInvertX: (v) => { set({ invertX: v }); save({ ...get(), invertX: v }); },
  setInvertY: (v) => { set({ invertY: v }); save({ ...get(), invertY: v }); },
  setInvertZ: (v) => { set({ invertZ: v }); save({ ...get(), invertZ: v }); },
  setDefaultXySpeed: (v) => { set({ defaultXySpeed: v }); save({ ...get(), defaultXySpeed: v }); },
  setDefaultZSpeed: (v) => { set({ defaultZSpeed: v }); save({ ...get(), defaultZSpeed: v }); },
}));
