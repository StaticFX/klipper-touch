import { create } from "zustand";
import { getConfig, saveConfig, type UtilityShortcut } from "@/lib/config";

interface UtilityConfigStore {
  loaded: boolean;
  shortcuts: UtilityShortcut[];
  loadFromConfig: () => Promise<void>;
  setShortcuts: (v: UtilityShortcut[]) => void;
}

export const useUtilityConfigStore = create<UtilityConfigStore>((set) => ({
  loaded: false,
  shortcuts: [
    { name: "Motors Off", gcode: "M84", confirm: false },
    { name: "Restart FW", gcode: "FIRMWARE_RESTART", confirm: true },
    { name: "Bed Mesh", gcode: "BED_MESH_CALIBRATE", confirm: true },
  ],

  loadFromConfig: async () => {
    try {
      const config = await getConfig();
      set({
        loaded: true,
        shortcuts: config.utility.shortcuts,
      });
    } catch {
      set({ loaded: true });
    }
  },

  setShortcuts: (v) => {
    set({ shortcuts: v });
    (async () => {
      try {
        const config = await getConfig();
        config.utility = { shortcuts: v };
        await saveConfig(config);
      } catch (e) {
        console.error("Failed to save utility config:", e);
      }
    })();
  },
}));
