import { useEffect } from "react";
import { usePrinterStore } from "@/stores/printer-store";
import { useBeaconConfigStore } from "@/stores/beacon-config-store";
import { sendGcode, queryBeacon } from "@/lib/moonraker/client";
import type { BeaconSample } from "@/lib/moonraker/types";

// Shared refcount so only one interval runs regardless of how many components use the hook
let refCount = 0;
let intervalId: ReturnType<typeof setInterval> | undefined;
let currentInterval = 0;

async function poll() {
  try {
    await sendGcode("BEACON_QUERY");
    await queryBeacon();
  } catch {
    // ignore — printer may be busy
  }
}

function startPolling(intervalMs: number) {
  stopPolling();
  currentInterval = intervalMs;
  poll();
  intervalId = setInterval(poll, intervalMs);
}

function stopPolling() {
  if (intervalId != null) {
    clearInterval(intervalId);
    intervalId = undefined;
  }
}

function extractDist(sample: BeaconSample | null | undefined): number | undefined {
  if (!sample) return undefined;
  const val = sample.dist ?? sample.distance ?? sample.z;
  return typeof val === "number" ? val : undefined;
}

/**
 * Returns the live beacon distance. Polls BEACON_QUERY at the configured
 * interval while any component using this hook is mounted.
 * Polling can be disabled in beacon settings.
 */
export function useBeaconLive(): number | undefined {
  const hasBeacon = usePrinterStore((s) => s.beacon !== null);
  const sample = usePrinterStore((s) => s.beacon?.last_sample);
  const enabled = useBeaconConfigStore((s) => s.livePollingEnabled);
  const intervalMs = useBeaconConfigStore((s) => s.pollIntervalMs);

  useEffect(() => {
    if (!hasBeacon || !enabled) {
      // If this consumer was counted, uncount it
      return;
    }
    refCount++;
    if (refCount === 1) startPolling(intervalMs);
    else if (intervalMs !== currentInterval) {
      // Interval changed while polling — restart with new rate
      startPolling(intervalMs);
    }
    return () => {
      refCount--;
      if (refCount === 0) stopPolling();
    };
  }, [hasBeacon, enabled, intervalMs]);

  return extractDist(sample);
}
