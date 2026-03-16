import { useEffect, useRef, useState, useCallback } from "react";
import { useConsoleStore } from "@/stores/console-store";
import { sendGcode, getGcodeStore } from "@/lib/moonraker/client";
import { usePrinterStore } from "@/stores/printer-store";

export function useConsoleInput() {
  const lines = useConsoleStore((s) => s.lines);
  const addLine = useConsoleStore((s) => s.addLine);
  const addLines = useConsoleStore((s) => s.addLines);
  const clear = useConsoleStore((s) => s.clear);
  const connected = usePrinterStore((s) => s.moonrakerConnected);
  const [cmd, setCmd] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [histIdx, setHistIdx] = useState(-1);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const loadedRef = useRef(false);

  // Load initial gcode store on first mount when connected
  useEffect(() => {
    if (!connected || loadedRef.current) return;
    loadedRef.current = true;
    getGcodeStore(200)
      .then((entries) => {
        if (entries.length > 0) {
          addLines(entries);
        }
      })
      .catch(() => {});
  }, [connected, addLines]);

  // Auto-scroll to bottom when new lines arrive
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      requestAnimationFrame(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      });
    }
  }, [lines, autoScroll]);

  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    setAutoScroll(scrollHeight - scrollTop - clientHeight < 40);
  }, []);

  const handleSend = useCallback(async () => {
    const trimmed = cmd.trim();
    if (!trimmed) return;

    addLine({ message: trimmed, time: Date.now() / 1000, type: "command" });
    setHistory((h) => [trimmed, ...h.slice(0, 49)]);
    setHistIdx(-1);
    setCmd("");

    try {
      await sendGcode(trimmed);
    } catch (e) {
      addLine({
        message: `Error: ${e instanceof Error ? e.message : String(e)}`,
        time: Date.now() / 1000,
        type: "response",
      });
    }
  }, [cmd, addLine]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSend();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (history.length > 0) {
        const next = Math.min(histIdx + 1, history.length - 1);
        setHistIdx(next);
        setCmd(history[next]);
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (histIdx > 0) {
        const next = histIdx - 1;
        setHistIdx(next);
        setCmd(history[next]);
      } else {
        setHistIdx(-1);
        setCmd("");
      }
    }
  }, [handleSend, history, histIdx]);

  const scrollToBottom = useCallback(() => {
    setAutoScroll(true);
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, []);

  return {
    lines, cmd, setCmd, autoScroll, scrollRef,
    handleScroll, handleSend, handleKeyDown, scrollToBottom, clear,
  };
}
