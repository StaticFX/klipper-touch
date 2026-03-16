import { useConsoleInput } from "@/hooks/use-console-input";
import { type ConsoleLine } from "@/stores/console-store";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, Trash2, ArrowDown } from "lucide-react";

export function ConsolePage() {
  const {
    lines, cmd, setCmd, autoScroll, scrollRef,
    handleScroll, handleSend, handleKeyDown, scrollToBottom, clear,
  } = useConsoleInput();

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
        <Button
          variant="outline"
          size="icon-sm"
          className="absolute right-3 bottom-20 rounded-full shadow-md"
          onClick={scrollToBottom}
        >
          <ArrowDown size={16} />
        </Button>
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
