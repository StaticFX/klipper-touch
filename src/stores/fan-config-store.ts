import { create } from "zustand";
import { getConfig, saveConfig } from "@/lib/config";

interface FanConfigStore {
  loaded: boolean;
  speedPresets: number[];
  loadFromConfig: () => Promise<void>;
  setSpeedPresets: (v: number[]) => void;
}

export const useFanConfigStore = create<FanConfigStore>((set) => ({
  loaded: false,
  speedPresets: [0, 25, 50, 75, 100],

  loadFromConfig: async () => {
    try {
      const config = await getConfig();
      set({
        loaded: true,
        speedPresets: config.fan.speed_presets,
      });
    } catch {
      set({ loaded: true });
    }
  },

  setSpeedPresets: (v) => {
    set({ speedPresets: v });
    (async () => {
      try {
        const config = await getConfig();
        config.fan = { speed_presets: v };
        await saveConfig(config);
      } catch (e) {
        console.error("Failed to save fan config:", e);
      }
    })();
  },
}));
