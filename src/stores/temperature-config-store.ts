import { create } from "zustand";
import { getConfig, saveConfig } from "@/lib/config";

interface TemperatureConfigStore {
  loaded: boolean;
  hotendPresets: number[];
  bedPresets: number[];
  loadFromConfig: () => Promise<void>;
  setHotendPresets: (v: number[]) => void;
  setBedPresets: (v: number[]) => void;
}

async function persist(state: { hotendPresets: number[]; bedPresets: number[] }) {
  try {
    const config = await getConfig();
    config.temperature = {
      hotend_presets: state.hotendPresets,
      bed_presets: state.bedPresets,
    };
    await saveConfig(config);
  } catch (e) {
    console.error("Failed to save temperature config:", e);
  }
}

export const useTemperatureConfigStore = create<TemperatureConfigStore>((set, get) => ({
  loaded: false,
  hotendPresets: [0, 190, 210, 250],
  bedPresets: [0, 60, 70, 110],

  loadFromConfig: async () => {
    try {
      const config = await getConfig();
      set({
        loaded: true,
        hotendPresets: config.temperature.hotend_presets,
        bedPresets: config.temperature.bed_presets,
      });
    } catch {
      set({ loaded: true });
    }
  },

  setHotendPresets: (v) => { set({ hotendPresets: v }); persist({ ...get(), hotendPresets: v }); },
  setBedPresets: (v) => { set({ bedPresets: v }); persist({ ...get(), bedPresets: v }); },
}));
