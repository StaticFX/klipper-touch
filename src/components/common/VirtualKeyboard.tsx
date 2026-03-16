import { useEffect, useRef, useCallback } from "react";
import Keyboard from "react-simple-keyboard";
import "react-simple-keyboard/build/css/index.css";
import { useKeyboardStore } from "@/stores/keyboard-store";
import { ChevronDown } from "lucide-react";

export function VirtualKeyboard() {
  const visible = useKeyboardStore((s) => s.visible);
  const hide = useKeyboardStore((s) => s.hide);
  const setHeight = useKeyboardStore((s) => s.setHeight);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const kbRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  // Track when user is interacting with the keyboard so focusout doesn't hide it
  const interactingRef = useRef(false);

  // Measure keyboard height when visible
  useEffect(() => {
    if (visible && containerRef.current) {
      // Wait one frame for layout
      requestAnimationFrame(() => {
        if (containerRef.current) {
          setHeight(containerRef.current.offsetHeight);
        }
      });
    } else if (!visible) {
      setHeight(0);
    }
  }, [visible, setHeight]);

  // Native value setters for React controlled inputs
  const nativeInputSetter = useRef(
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!
  );
  const nativeTextareaSetter = useRef(
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")!
      .set!
  );

  const setNativeValue = useCallback(
    (el: HTMLInputElement | HTMLTextAreaElement, value: string) => {
      if (el instanceof HTMLTextAreaElement) {
        nativeTextareaSetter.current.call(el, value);
      } else {
        nativeInputSetter.current.call(el, value);
      }
      el.dispatchEvent(new Event("input", { bubbles: true }));
    },
    []
  );

  // Listen for focus events on input/textarea
  useEffect(() => {
    const show = useKeyboardStore.getState().show;

    const handleFocusIn = (e: FocusEvent) => {
      const el = e.target;
      if (
        el instanceof HTMLInputElement ||
        el instanceof HTMLTextAreaElement
      ) {
        const type = (el as HTMLInputElement).type;
        if (
          type === "range" ||
          type === "checkbox" ||
          type === "radio" ||
          type === "hidden"
        )
          return;
        show(el);
        // Sync keyboard input with current field value
        if (kbRef.current) {
          kbRef.current.setInput(el.value);
        }
        setTimeout(() => {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 100);
      }
    };

    const handleFocusOut = () => {
      setTimeout(() => {
        // If the keyboard is being tapped, don't hide — refocus the input
        if (interactingRef.current) return;

        const active = document.activeElement;
        // If focus moved to another input, keep keyboard open (store will update target)
        if (
          active instanceof HTMLInputElement ||
          active instanceof HTMLTextAreaElement
        )
          return;
        // If focus is inside the keyboard container, don't hide
        if (containerRef.current?.contains(active as Node)) return;
        hide();
      }, 200);
    };

    document.addEventListener("focusin", handleFocusIn);
    document.addEventListener("focusout", handleFocusOut);
    return () => {
      document.removeEventListener("focusin", handleFocusIn);
      document.removeEventListener("focusout", handleFocusOut);
    };
  }, [hide]);

  const refocusTarget = useCallback(() => {
    const t = useKeyboardStore.getState().target;
    if (t) {
      t.focus();
    }
    interactingRef.current = false;
  }, []);

  const onChange = useCallback(
    (input: string) => {
      const t = useKeyboardStore.getState().target;
      if (!t) return;
      setNativeValue(t, input);
      const pos = input.length;
      t.setSelectionRange(pos, pos);
      refocusTarget();
    },
    [setNativeValue, refocusTarget]
  );

  const onKeyPress = useCallback(
    (button: string) => {
      const t = useKeyboardStore.getState().target;
      if (!t) return;

      if (button === "{enter}") {
        t.dispatchEvent(
          new KeyboardEvent("keydown", { key: "Enter", bubbles: true })
        );
        hide();
        return;
      }

      if (button === "{numbers}") {
        kbRef.current?.setOptions({ layoutName: "numbers" });
        refocusTarget();
        return;
      }

      if (button === "{abc}") {
        kbRef.current?.setOptions({ layoutName: "default" });
        refocusTarget();
        return;
      }

      if (button === "{shift}") {
        const current = kbRef.current?.options?.layoutName;
        kbRef.current?.setOptions({
          layoutName: current === "shift" ? "default" : "shift",
        });
        refocusTarget();
        return;
      }

      // Regular keys — refocus handled by onChange
    },
    [hide, refocusTarget]
  );

  const handleClose = useCallback(() => {
    interactingRef.current = false;
    const t = useKeyboardStore.getState().target;
    if (t) t.blur();
    hide();
  }, [hide]);

  return (
    <div
      ref={containerRef}
      className="keyboard-wrapper border-t border-border"
      style={{
        display: visible ? "block" : "none",
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        backgroundColor: "var(--color-card)",
      }}
      onPointerDown={() => {
        interactingRef.current = true;
      }}
    >
      {/* Close bar */}
      <div className="flex justify-end px-2 py-1" style={{ backgroundColor: "var(--color-card)" }}>
        <button
          onClick={handleClose}
          className="flex items-center gap-1 text-xs text-muted-foreground px-2 py-1 rounded active:bg-accent"
        >
          <ChevronDown size={14} />
          Close
        </button>
      </div>
      <Keyboard
        keyboardRef={(r) => (kbRef.current = r)}
        onChange={onChange}
        onKeyPress={onKeyPress}
        preventMouseDownDefault
        mergeDisplay
        display={{
          "{bksp}": "⌫ Delete",
          "{enter}": "↵",
          "{shift}": "⇧ Shift",
          "{space}": " ",
          "{numbers}": "123",
          "{abc}": "ABC",
        }}
        layout={{
          default: [
            "q w e r t y u i o p {bksp}",
            "a s d f g h j k l {enter}",
            "{shift} z x c v b n m {shift}",
            "{numbers} {space} .",
          ],
          shift: [
            "Q W E R T Y U I O P {bksp}",
            "A S D F G H J K L {enter}",
            "{shift} Z X C V B N M {shift}",
            "{numbers} {space} .",
          ],
          numbers: [
            "1 2 3 4 5 6 7 8 9 0 {bksp}",
            "- / : ; ( ) $ & @ {enter}",
            ". , ? ! ' \" _ # + =",
            "{abc} {space} .",
          ],
        }}
        buttonTheme={[
          {
            class: "kb-action-key",
            buttons: "{bksp} {enter} {shift} {numbers} {abc}",
          },
          {
            class: "kb-space-key",
            buttons: "{space}",
          },
        ]}
        theme="hg-theme-default hg-theme-klipper"
      />
    </div>
  );
}
