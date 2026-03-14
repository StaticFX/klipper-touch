import { useCallback, useRef, useState } from "react";
import { sendGcode } from "@/lib/moonraker/client";

export function useGcode() {
  const [busy, setBusy] = useState(false);
  const count = useRef(0);

  const send = useCallback(async (cmd: string) => {
    count.current++;
    setBusy(true);
    try {
      await sendGcode(cmd);
    } catch (err) {
      console.error("Gcode error:", err);
    } finally {
      count.current--;
      if (count.current === 0) setBusy(false);
    }
  }, []);

  return { send, busy };
}
