import { useCallback } from "react";
import { sendGcode } from "@/lib/moonraker/client";

export function useGcode() {
  const send = useCallback(async (cmd: string) => {
    try {
      await sendGcode(cmd);
    } catch (err) {
      console.error("Gcode error:", err);
    }
  }, []);

  return { send };
}
