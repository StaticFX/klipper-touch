import { create } from "zustand";
import { getConfig, saveConfig } from "@/lib/config";

interface MovementSettings {
  invertX: boolean;
  invertY: boolean;
  invertZ: boolean;
  defaultXySpeed: number; // mm/s
  defaultZSpeed: number;  // mm/s
}

interface MovementStore extends MovementSettings {
  loaded: boolean;
  loadFromConfig: () => Promise<void>;
  setInvertX: (v: boolean) => void;
  setInvertY: (v: boolean) => void;
  setInvertZ: (v: boolean) => void;
  setDefaultXySpeed: (v: number) => void;
  setDefaultZSpeed: (v: number) => void;
}

async function persistToConfig(state: MovementSettings) {
  try {
    const config = await getConfig();
    config.movement = {
      invert_x: state.invertX,
      invert_y: state.invertY,
      invert_z: state.invertZ,
      xy_speed: state.defaultXySpeed,
      z_speed: state.defaultZSpeed,
    };
    await saveConfig(config);
  } catch (e) {
    console.error("Failed to save movement config:", e);
  }
}

export const useMovementStore = create<MovementStore>((set, get) => ({
  loaded: false,
  invertX: false,
  invertY: false,
  invertZ: false,
  defaultXySpeed: 100,
  defaultZSpeed: 10,

  loadFromConfig: async () => {
    try {
      const config = await getConfig();
      set({
        loaded: true,
        invertX: config.movement.invert_x,
        invertY: config.movement.invert_y,
        invertZ: config.movement.invert_z,
        defaultXySpeed: config.movement.xy_speed,
        defaultZSpeed: config.movement.z_speed,
      });
    } catch {
      set({ loaded: true });
    }
  },

  setInvertX: (v) => { set({ invertX: v }); persistToConfig({ ...get(), invertX: v }); },
  setInvertY: (v) => { set({ invertY: v }); persistToConfig({ ...get(), invertY: v }); },
  setInvertZ: (v) => { set({ invertZ: v }); persistToConfig({ ...get(), invertZ: v }); },
  setDefaultXySpeed: (v) => { set({ defaultXySpeed: v }); persistToConfig({ ...get(), defaultXySpeed: v }); },
  setDefaultZSpeed: (v) => { set({ defaultZSpeed: v }); persistToConfig({ ...get(), defaultZSpeed: v }); },
}));
