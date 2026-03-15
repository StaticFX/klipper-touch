import { create } from "zustand";
import type {
  PrintStats,
  DisplayStatus,
  VirtualSdCardStatus,
} from "@/lib/moonraker/types";

interface PrintStore {
  print_stats: PrintStats;
  display_status: DisplayStatus;
  virtual_sdcard: VirtualSdCardStatus;
  thumbnailUrl: string | null;

  updateStatus: (data: Record<string, unknown>) => void;
  setThumbnailUrl: (url: string | null) => void;
}

export const usePrintStore = create<PrintStore>((set, get) => ({
  print_stats: {
    state: "standby",
    filename: "",
    total_duration: 0,
    print_duration: 0,
    filament_used: 0,
    message: "",
  },
  display_status: { progress: 0, message: "" },
  thumbnailUrl: null,
  virtual_sdcard: {
    progress: 0,
    is_active: false,
    file_position: 0,
    file_path: "",
  },

  setThumbnailUrl: (url) => set({ thumbnailUrl: url }),

  updateStatus: (data) => {
    const updates: Partial<PrintStore> = {};
    if (data.print_stats) {
      const incoming = data.print_stats as Partial<PrintStats>;
      const current = get().print_stats;
      updates.print_stats = {
        ...current,
        ...incoming,
        info: { ...current.info, ...incoming.info },
      };
    }
    if (data.display_status) {
      updates.display_status = { ...get().display_status, ...(data.display_status as Partial<DisplayStatus>) };
    }
    if (data.virtual_sdcard) {
      updates.virtual_sdcard = { ...get().virtual_sdcard, ...(data.virtual_sdcard as Partial<VirtualSdCardStatus>) };
    }
    set(updates);
  },
}));
