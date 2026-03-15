import { create } from "zustand";

export interface ConsoleLine {
  message: string;
  time: number;
  type: "command" | "response";
}

const MAX_LINES = 500;

interface ConsoleStore {
  lines: ConsoleLine[];
  addLine: (line: ConsoleLine) => void;
  addLines: (lines: ConsoleLine[]) => void;
  clear: () => void;
}

export const useConsoleStore = create<ConsoleStore>((set) => ({
  lines: [],

  addLine: (line) =>
    set((s) => ({
      lines: [...s.lines, line].slice(-MAX_LINES),
    })),

  addLines: (lines) =>
    set((s) => ({
      lines: [...s.lines, ...lines].slice(-MAX_LINES),
    })),

  clear: () => set({ lines: [] }),
}));
