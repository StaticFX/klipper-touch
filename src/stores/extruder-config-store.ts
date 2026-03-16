import { create } from "zustand";
import { getConfig, saveConfig } from "@/lib/config";

interface ExtruderConfigState {
  defaultFeedAmount: number;
  defaultFeedSpeed: number;
  loadMacro: string;
  unloadMacro: string;
  filamentDiameter: number;
}

interface ExtruderConfigStore extends ExtruderConfigState {
  loaded: boolean;
  loadFromConfig: () => Promise<void>;
  setDefaultFeedAmount: (v: number) => void;
  setDefaultFeedSpeed: (v: number) => void;
  setLoadMacro: (v: string) => void;
  setUnloadMacro: (v: string) => void;
  setFilamentDiameter: (v: number) => void;
}

async function persist(state: ExtruderConfigState) {
  try {
    const config = await getConfig();
    config.extruder = {
      default_feed_amount: state.defaultFeedAmount,
      default_feed_speed: state.defaultFeedSpeed,
      load_macro: state.loadMacro,
      unload_macro: state.unloadMacro,
      filament_diameter: state.filamentDiameter,
    };
    await saveConfig(config);
  } catch (e) {
    console.error("Failed to save extruder config:", e);
  }
}

export const useExtruderConfigStore = create<ExtruderConfigStore>((set, get) => ({
  loaded: false,
  defaultFeedAmount: 10,
  defaultFeedSpeed: 5,
  loadMacro: "",
  unloadMacro: "",
  filamentDiameter: 1.75,

  loadFromConfig: async () => {
    try {
      const config = await getConfig();
      set({
        loaded: true,
        defaultFeedAmount: config.extruder.default_feed_amount,
        defaultFeedSpeed: config.extruder.default_feed_speed,
        loadMacro: config.extruder.load_macro,
        unloadMacro: config.extruder.unload_macro,
        filamentDiameter: config.extruder.filament_diameter,
      });
    } catch {
      set({ loaded: true });
    }
  },

  setDefaultFeedAmount: (v) => { set({ defaultFeedAmount: v }); persist({ ...get(), defaultFeedAmount: v }); },
  setDefaultFeedSpeed: (v) => { set({ defaultFeedSpeed: v }); persist({ ...get(), defaultFeedSpeed: v }); },
  setLoadMacro: (v) => { set({ loadMacro: v }); persist({ ...get(), loadMacro: v }); },
  setUnloadMacro: (v) => { set({ unloadMacro: v }); persist({ ...get(), unloadMacro: v }); },
  setFilamentDiameter: (v) => { set({ filamentDiameter: v }); persist({ ...get(), filamentDiameter: v }); },
}));
