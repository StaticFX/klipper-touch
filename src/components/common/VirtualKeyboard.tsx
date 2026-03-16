import { useEffect, useRef, useCallback } from "react";
import Keyboard from "react-simple-keyboard";
import "react-simple-keyboard/build/css/index.css";
import { useKeyboardStore } from "@/stores/keyboard-store";

export function VirtualKeyboard() {
  const visible = useKeyboardStore((s) => s.visible);
  const target = useKeyboardStore((s) => s.target);
  const hide = useKeyboardStore((s) => s.hide);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const kbRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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

    const handleFocusOut = (e: FocusEvent) => {
      const related = e.relatedTarget as HTMLElement | null;
      if (related && containerRef.current?.contains(related)) return;

      setTimeout(() => {
        const active = document.activeElement;
        if (
          active instanceof HTMLInputElement ||
          active instanceof HTMLTextAreaElement
        )
          return;
        if (containerRef.current?.contains(active as Node)) return;
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

  const onChange = useCallback(
    (input: string) => {
      if (!target) return;
      setNativeValue(target, input);
      // Restore cursor to end
      const pos = input.length;
      target.setSelectionRange(pos, pos);
      target.focus();
    },
    [target, setNativeValue]
  );

  const onKeyPress = useCallback(
    (button: string) => {
      if (!target) return;

      if (button === "{enter}") {
        target.dispatchEvent(
          new KeyboardEvent("keydown", { key: "Enter", bubbles: true })
        );
        hide();
        return;
      }

      if (button === "{numbers}") {
        kbRef.current?.setOptions({ layoutName: "numbers" });
        target.focus();
        return;
      }

      if (button === "{abc}") {
        kbRef.current?.setOptions({ layoutName: "default" });
        target.focus();
        return;
      }

      if (button === "{shift}") {
        const current = kbRef.current?.options?.layoutName;
        kbRef.current?.setOptions({
          layoutName: current === "shift" ? "default" : "shift",
        });
        target.focus();
        return;
      }

      // Keep focus on the input
      target.focus();
    },
    [target, hide]
  );

  // Prevent touches on keyboard from stealing focus from the input
  const preventFocusLoss = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
  };

  if (!visible) return null;

  return (
    <div
      ref={containerRef}
      className="keyboard-wrapper shrink-0 border-t border-border"
      onMouseDown={preventFocusLoss}
      onTouchStart={preventFocusLoss}
    >
      <Keyboard
        keyboardRef={(r) => (kbRef.current = r)}
        onChange={onChange}
        onKeyPress={onKeyPress}
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
