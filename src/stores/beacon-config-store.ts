import { create } from "zustand";
import { getConfig, saveConfig } from "@/lib/config";

interface BeaconSettings {
  livePollingEnabled: boolean;
  pollIntervalMs: number;
}

interface BeaconConfigStore extends BeaconSettings {
  loaded: boolean;
  loadFromConfig: () => Promise<void>;
  setLivePollingEnabled: (v: boolean) => void;
  setPollIntervalMs: (v: number) => void;
}

const DEFAULTS: BeaconSettings = {
  livePollingEnabled: true,
  pollIntervalMs: 2000,
};

async function persistToConfig(state: BeaconSettings) {
  try {
    const config = await getConfig();
    config.beacon = {
      live_polling_enabled: state.livePollingEnabled,
      poll_interval_ms: state.pollIntervalMs,
    };
    await saveConfig(config);
  } catch (e) {
    console.error("Failed to save beacon config:", e);
  }
}

export const useBeaconConfigStore = create<BeaconConfigStore>((set, get) => ({
  ...DEFAULTS,
  loaded: false,

  loadFromConfig: async () => {
    try {
      const config = await getConfig();
      const b = config.beacon;
      if (b) {
        set({
          loaded: true,
          livePollingEnabled: b.live_polling_enabled ?? DEFAULTS.livePollingEnabled,
          pollIntervalMs: b.poll_interval_ms ?? DEFAULTS.pollIntervalMs,
        });
      } else {
        set({ loaded: true });
      }
    } catch {
      set({ loaded: true });
    }
  },

  setLivePollingEnabled: (v) => { set({ livePollingEnabled: v }); persistToConfig({ ...get(), livePollingEnabled: v }); },
  setPollIntervalMs: (v) => { set({ pollIntervalMs: v }); persistToConfig({ ...get(), pollIntervalMs: v }); },
}));
