import { create } from "zustand";
import type { GcodeFile } from "@/lib/moonraker/types";
import { getFileList, getFileMetadata } from "@/lib/moonraker/client";

interface FilesStore {
  files: GcodeFile[];
  loading: boolean;
  error: string | null;
  loadedMeta: Set<string>;
  fetchFiles: () => Promise<void>;
  fetchMetadata: (path: string) => Promise<void>;
}

export const useFilesStore = create<FilesStore>((set, get) => ({
  files: [],
  loading: false,
  error: null,
  loadedMeta: new Set(),

  fetchFiles: async () => {
    set({ loading: true, error: null });
    try {
      const files = await getFileList();
      files.sort((a, b) => b.modified - a.modified);
      set({ files, loading: false, loadedMeta: new Set() });
    } catch (err) {
      set({ error: String(err), loading: false });
    }
  },

  fetchMetadata: async (path: string) => {
    const { loadedMeta } = get();
    if (loadedMeta.has(path)) return;
    // Mark as loading immediately to prevent duplicate fetches
    loadedMeta.add(path);
    set({ loadedMeta: new Set(loadedMeta) });
    try {
      const meta = await getFileMetadata(path);
      const current = get().files;
      set({
        files: current.map((f) =>
          f.path === path
            ? { ...f, thumbnails: meta.thumbnails, estimated_time: meta.estimated_time }
            : f
        ),
      });
    } catch {
      // best-effort
    }
  },
}));
