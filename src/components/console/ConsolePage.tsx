import { useEffect, useRef, useState } from "react";
import { useConsoleStore, type ConsoleLine } from "@/stores/console-store";
import { sendGcode, getGcodeStore } from "@/lib/moonraker/client";
import { usePrinterStore } from "@/stores/printer-store";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, Trash2, ArrowDown } from "lucide-react";

export function ConsolePage() {
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
      // Use rAF to ensure DOM has rendered new lines before scrolling
      requestAnimationFrame(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      });
    }
  }, [lines, autoScroll]);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    setAutoScroll(scrollHeight - scrollTop - clientHeight < 40);
  };

  const handleSend = async () => {
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
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
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
  };

  return (
    <div className="flex flex-col h-full">
      {/* Output area */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 min-h-0 overflow-y-auto p-2 font-mono text-xs leading-relaxed bg-background"
      >
        {lines.length === 0 ? (
          <div className="text-muted-foreground text-center py-8">
            No console output yet
          </div>
        ) : (
          lines.map((line, i) => <LineRow key={i} line={line} />)
        )}
      </div>

      {/* Scroll-to-bottom indicator */}
      {!autoScroll && (
        <button
          onClick={() => {
            setAutoScroll(true);
            scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
          }}
          className="absolute right-3 bottom-20 p-2 rounded-full bg-card border border-border shadow-md active:scale-95"
        >
          <ArrowDown size={16} />
        </button>
      )}

      {/* Input bar */}
      <div className="flex items-center gap-2 p-2 border-t border-border bg-card shrink-0">
        <Button variant="ghost" size="icon-xs" onClick={clear}>
          <Trash2 size={14} />
        </Button>
        <Input
          value={cmd}
          onChange={(e) => setCmd(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Enter GCode command..."
          className="flex-1 h-9 font-mono text-sm"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="characters"
          spellCheck={false}
        />
        <Button
          size="icon-xs"
          onClick={handleSend}
          disabled={!cmd.trim()}
        >
          <Send size={14} />
        </Button>
      </div>
    </div>
  );
}

function LineRow({ line }: { line: ConsoleLine }) {
  const isCmd = line.type === "command";
  return (
    <div className={`px-1 py-0.5 ${isCmd ? "text-primary font-medium" : "text-muted-foreground"}`}>
      {isCmd && <span className="text-primary/60 mr-1">&gt;</span>}
      {line.message}
    </div>
  );
}
