import { useState, useEffect, useCallback, useRef } from "react";
import { useKeyboardStore } from "@/stores/keyboard-store";
import { Delete, CornerDownLeft, ChevronUp } from "lucide-react";

const ROWS_LOWER = [
  ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
  ["a", "s", "d", "f", "g", "h", "j", "k", "l"],
  ["z", "x", "c", "v", "b", "n", "m"],
];

const ROWS_UPPER = ROWS_LOWER.map((row) => row.map((k) => k.toUpperCase()));

const ROWS_NUMBERS = [
  ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"],
  ["-", "/", ":", ";", "(", ")", "$", "&", "@"],
  [".", ",", "?", "!", "'", '"', "_", "#"],
];

// Native value setter to trigger React's onChange on controlled inputs
const nativeInputSetter = Object.getOwnPropertyDescriptor(
  HTMLInputElement.prototype,
  "value"
)!.set!;
const nativeTextareaSetter = Object.getOwnPropertyDescriptor(
  HTMLTextAreaElement.prototype,
  "value"
)!.set!;

function setNativeValue(
  el: HTMLInputElement | HTMLTextAreaElement,
  value: string
) {
  if (el instanceof HTMLTextAreaElement) {
    nativeTextareaSetter.call(el, value);
  } else {
    nativeInputSetter.call(el, value);
  }
  el.dispatchEvent(new Event("input", { bubbles: true }));
}

export function VirtualKeyboard() {
  const visible = useKeyboardStore((s) => s.visible);
  const target = useKeyboardStore((s) => s.target);
  const hide = useKeyboardStore((s) => s.hide);
  const [shifted, setShifted] = useState(false);
  const [numbers, setNumbers] = useState(false);
  const kbRef = useRef<HTMLDivElement>(null);

  // Listen for focus events on input/textarea elements
  useEffect(() => {
    const show = useKeyboardStore.getState().show;

    const handleFocusIn = (e: FocusEvent) => {
      const el = e.target;
      if (
        el instanceof HTMLInputElement ||
        el instanceof HTMLTextAreaElement
      ) {
        // Skip non-text inputs
        const type = (el as HTMLInputElement).type;
        if (
          type === "range" ||
          type === "checkbox" ||
          type === "radio" ||
          type === "hidden"
        )
          return;
        show(el);
        // Scroll the input into view after a short delay (for layout to settle)
        setTimeout(() => {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 100);
      }
    };

    const handleFocusOut = (e: FocusEvent) => {
      // Don't hide if focus moved to the keyboard itself
      const related = e.relatedTarget as HTMLElement | null;
      if (related && kbRef.current?.contains(related)) return;

      // Delay to allow keyboard button clicks to complete
      setTimeout(() => {
        const active = document.activeElement;
        // If focus moved back to an input, keep keyboard open
        if (
          active instanceof HTMLInputElement ||
          active instanceof HTMLTextAreaElement
        ) {
          return;
        }
        // If focus is inside the keyboard, keep it open
        if (kbRef.current?.contains(active as Node)) return;
        hide();
      }, 150);
    };

    document.addEventListener("focusin", handleFocusIn);
    document.addEventListener("focusout", handleFocusOut);
    return () => {
      document.removeEventListener("focusin", handleFocusIn);
      document.removeEventListener("focusout", handleFocusOut);
    };
  }, [hide]);

  const insertChar = useCallback(
    (char: string) => {
      if (!target) return;
      const start = target.selectionStart ?? target.value.length;
      const end = target.selectionEnd ?? target.value.length;
      const newValue =
        target.value.slice(0, start) + char + target.value.slice(end);
      setNativeValue(target, newValue);
      const pos = start + char.length;
      target.setSelectionRange(pos, pos);
      target.focus();
      // Auto-unshift after typing one character
      if (shifted) setShifted(false);
    },
    [target, shifted]
  );

  const handleBackspace = useCallback(() => {
    if (!target) return;
    const start = target.selectionStart ?? target.value.length;
    const end = target.selectionEnd ?? target.value.length;
    let newValue: string;
    let pos: number;
    if (start !== end) {
      newValue = target.value.slice(0, start) + target.value.slice(end);
      pos = start;
    } else if (start > 0) {
      newValue = target.value.slice(0, start - 1) + target.value.slice(start);
      pos = start - 1;
    } else {
      return;
    }
    setNativeValue(target, newValue);
    target.setSelectionRange(pos, pos);
    target.focus();
  }, [target]);

  const handleEnter = useCallback(() => {
    if (!target) return;
    // Dispatch Enter keydown so React form handlers fire
    target.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", bubbles: true })
    );
    hide();
  }, [target, hide]);

  const handleSpace = useCallback(() => {
    insertChar(" ");
  }, [insertChar]);

  // Prevent mousedown/touchstart on keyboard buttons from stealing focus
  const preventFocusLoss = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
  };

  if (!visible) return null;

  const rows = numbers ? ROWS_NUMBERS : shifted ? ROWS_UPPER : ROWS_LOWER;

  return (
    <div
      ref={kbRef}
      className="shrink-0 border-t border-border bg-card px-1 pb-1 pt-1"
      onMouseDown={preventFocusLoss}
      onTouchStart={preventFocusLoss}
    >
      {/* Letter/number rows */}
      {rows.map((row, ri) => (
        <div key={ri} className="flex justify-center gap-[3px] mb-[3px]">
          {row.map((key) => (
            <button
              key={key}
              onMouseDown={preventFocusLoss}
              onTouchStart={preventFocusLoss}
              onClick={() => insertChar(key)}
              className="flex-1 flex items-center justify-center rounded bg-muted text-foreground h-10 max-w-[72px] text-sm font-medium active:scale-95 active:bg-accent"
            >
              {key}
            </button>
          ))}
        </div>
      ))}

      {/* Shift + Backspace row */}
      <div className="flex gap-[3px] mb-[3px]">
        {!numbers ? (
          <button
            onMouseDown={preventFocusLoss}
            onTouchStart={preventFocusLoss}
            onClick={() => setShifted((s) => !s)}
            className={`flex items-center justify-center gap-1 rounded h-10 flex-1 text-xs font-semibold active:scale-95 ${
              shifted
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground border border-border"
            }`}
          >
            <ChevronUp size={16} />
            Shift
          </button>
        ) : (
          <div className="flex-1" />
        )}
        <button
          onMouseDown={preventFocusLoss}
          onTouchStart={preventFocusLoss}
          onClick={handleBackspace}
          className="flex items-center justify-center gap-1 rounded bg-secondary text-secondary-foreground border border-border h-10 flex-1 text-xs font-semibold active:scale-95 active:bg-destructive/20"
        >
          <Delete size={16} />
          Delete
        </button>
      </div>

      {/* Bottom row: 123/ABC, space, ., enter */}
      <div className="flex gap-[3px]">
        <button
          onMouseDown={preventFocusLoss}
          onTouchStart={preventFocusLoss}
          onClick={() => { setNumbers((n) => !n); setShifted(false); }}
          className="flex items-center justify-center rounded bg-muted text-foreground h-10 px-3 text-xs font-medium active:scale-95 active:bg-accent"
        >
          {numbers ? "ABC" : "123"}
        </button>
        <button
          onMouseDown={preventFocusLoss}
          onTouchStart={preventFocusLoss}
          onClick={handleSpace}
          className="flex-1 flex items-center justify-center rounded bg-muted text-foreground h-10 text-sm active:scale-95 active:bg-accent"
        >
          space
        </button>
        <button
          onMouseDown={preventFocusLoss}
          onTouchStart={preventFocusLoss}
          onClick={() => insertChar(".")}
          className="flex items-center justify-center rounded bg-muted text-foreground h-10 px-4 text-sm font-medium active:scale-95 active:bg-accent"
        >
          .
        </button>
        <button
          onMouseDown={preventFocusLoss}
          onTouchStart={preventFocusLoss}
          onClick={handleEnter}
          className="flex items-center justify-center rounded bg-primary text-primary-foreground h-10 px-3 active:scale-95"
        >
          <CornerDownLeft size={16} />
        </button>
      </div>
    </div>
  );
}
