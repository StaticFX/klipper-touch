import { create } from "zustand";
import {
  getHistory,
  getHistoryTotals,
  deleteHistoryJob,
} from "@/lib/moonraker/client";
import type { HistoryJob, HistoryTotals } from "@/lib/moonraker/types";

interface HistoryStore {
  jobs: HistoryJob[];
  totals: HistoryTotals | null;
  loading: boolean;
  hasMore: boolean;
  error: string | null;

  fetchJobs: (reset?: boolean) => Promise<void>;
  fetchMore: () => Promise<void>;
  fetchTotals: () => Promise<void>;
  removeJob: (uid: string) => Promise<void>;
}

const PAGE_SIZE = 20;

export const useHistoryStore = create<HistoryStore>((set, get) => ({
  jobs: [],
  totals: null,
  loading: false,
  hasMore: true,
  error: null,

  fetchJobs: async (reset = true) => {
    set({ loading: true, error: null, ...(reset ? { jobs: [], hasMore: true } : {}) });
    try {
      const result = await getHistory(PAGE_SIZE, 0);
      set({ jobs: result.jobs, hasMore: result.jobs.length >= PAGE_SIZE, loading: false });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : String(err), loading: false });
    }
  },

  fetchMore: async () => {
    const { jobs, hasMore, loading } = get();
    if (!hasMore || loading) return;
    set({ loading: true });
    try {
      const result = await getHistory(PAGE_SIZE, jobs.length);
      set({
        jobs: [...jobs, ...result.jobs],
        hasMore: result.jobs.length >= PAGE_SIZE,
        loading: false,
      });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : String(err), loading: false });
    }
  },

  fetchTotals: async () => {
    try {
      const totals = await getHistoryTotals();
      set({ totals });
    } catch {
      // totals are optional
    }
  },

  removeJob: async (uid) => {
    await deleteHistoryJob(uid);
    set({ jobs: get().jobs.filter((j) => j.job_id !== uid) });
  },
}));
