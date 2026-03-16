import { useCallback, useRef, useState } from "react";
import { sendGcode } from "@/lib/moonraker/client";
import { useToastStore } from "@/stores/toast-store";

export function useGcode() {
  const [busy, setBusy] = useState(false);
  const count = useRef(0);
  const addToast = useToastStore((s) => s.addToast);

  const send = useCallback(async (cmd: string) => {
    count.current++;
    setBusy(true);
    try {
      await sendGcode(cmd);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      addToast(message, "error");
    } finally {
      count.current--;
      if (count.current === 0) setBusy(false);
    }
  }, [addToast]);

  return { send, busy };
}
