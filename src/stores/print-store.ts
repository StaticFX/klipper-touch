import { create } from "zustand";
import type {
  PrintStats,
  DisplayStatus,
  VirtualSdCardStatus,
} from "@/lib/moonraker/types";

export interface PrintSummary {
  filename: string;
  state: "complete" | "cancelled" | "error";
  total_duration: number;
  print_duration: number;
  filament_used: number;
  layers: string;
  thumbnailUrl: string | null;
}

interface PrintStore {
  print_stats: PrintStats;
  display_status: DisplayStatus;
  virtual_sdcard: VirtualSdCardStatus;
  thumbnailUrl: string | null;
  printSummary: PrintSummary | null;

  updateStatus: (data: Record<string, unknown>) => void;
  setThumbnailUrl: (url: string | null) => void;
  dismissSummary: () => void;
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
  printSummary: null,
  virtual_sdcard: {
    progress: 0,
    is_active: false,
    file_position: 0,
    file_path: "",
  },

  setThumbnailUrl: (url) => set({ thumbnailUrl: url }),
  dismissSummary: () => set({ printSummary: null }),

  updateStatus: (data) => {
    const updates: Partial<PrintStore> = {};
    if (data.print_stats) {
      const incoming = data.print_stats as Partial<PrintStats>;
      const current = get().print_stats;
      const merged = {
        ...current,
        ...incoming,
        info: { ...current.info, ...incoming.info },
      };
      updates.print_stats = merged;

      // Capture summary when print ends
      const wasActive = current.state === "printing" || current.state === "paused";
      const nowDone = merged.state === "complete" || merged.state === "cancelled" || merged.state === "error";
      if (wasActive && nowDone) {
        const layers = merged.info?.current_layer && merged.info?.total_layer
          ? `${merged.info.current_layer} / ${merged.info.total_layer}`
          : "--";
        updates.printSummary = {
          filename: merged.filename,
          state: merged.state as "complete" | "cancelled" | "error",
          total_duration: merged.total_duration,
          print_duration: merged.print_duration,
          filament_used: merged.filament_used,
          layers,
          thumbnailUrl: get().thumbnailUrl,
        };
      }
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
