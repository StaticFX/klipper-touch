import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Button } from "@/components/ui/button";

interface NetworkInfo {
  hostname: string;
  ip_address: string | null;
  wifi_ssid: string | null;
  wifi_signal: string | null;
}

export function NetworkPage() {
  const [info, setInfo] = useState<NetworkInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = () => {
    invoke<NetworkInfo>("get_network_info")
      .then(setInfo)
      .catch((e) => setError(String(e)));
  };

  useEffect(() => {
    refresh();
  }, []);

  return (
    <div className="p-3 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-muted-foreground">Network</h2>
        <Button variant="ghost" size="xs" onClick={refresh}>
          Refresh
        </Button>
      </div>

      {error && (
        <div className="text-destructive text-sm">{error}</div>
      )}

      {info && (
        <div className="bg-card border border-border rounded-xl divide-y divide-border">
          <InfoRow label="Hostname" value={info.hostname} />
          <InfoRow label="IP Address" value={info.ip_address ?? "N/A"} />
          <InfoRow label="WiFi SSID" value={info.wifi_ssid ?? "N/A"} />
          <InfoRow label="Signal" value={info.wifi_signal ?? "N/A"} />
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}
