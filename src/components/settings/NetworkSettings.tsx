import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useWifi } from "@/hooks/use-wifi";
import { InfoRow } from "./InfoRow";
import {
  Wifi, RefreshCw, Loader2, Lock, Signal, Trash2, Check, X,
} from "lucide-react";

export function NetworkSettings() {
  const {
    network, wifiList, saved, scanning, connecting,
    passwordSsid, password, setPassword, error,
    scanWifi, connectToWifi, forgetNetwork, handleNetworkTap,
    clearPassword, clearError,
  } = useWifi();

  const signalIcon = (signal: number) => {
    if (signal >= 70) return <Signal size={14} className="text-green-500" />;
    if (signal >= 40) return <Signal size={14} className="text-yellow-500" />;
    return <Signal size={14} className="text-red-500" />;
  };

  return (
    <div className="space-y-4">
      {/* Current connection */}
      <div>
        <div className="text-xs text-muted-foreground mb-2 font-medium">Current Connection</div>
        {network ? (
          <div className="space-y-2">
            <InfoRow label="Hostname" value={network.hostname} />
            <InfoRow label="IP Address" value={network.ip_address ?? "N/A"} />
            <InfoRow label="WiFi" value={network.wifi_ssid ?? "Not connected"} />
            <InfoRow label="Signal" value={network.wifi_signal ?? "N/A"} />
          </div>
        ) : (
          <span className="text-sm text-muted-foreground">Loading...</span>
        )}
      </div>

      {/* Error display */}
      {error && (
        <div className="flex items-center gap-2 p-2 rounded-xl bg-destructive/10 border border-destructive/20">
          <X size={14} className="text-destructive shrink-0" />
          <span className="text-xs text-destructive flex-1">{error}</span>
          <Button variant="ghost" size="icon-xs" onClick={clearError}>
            <X size={12} className="text-destructive" />
          </Button>
        </div>
      )}

      {/* Password dialog */}
      {passwordSsid && (
        <div className="rounded-xl border border-border bg-muted/30 p-3 space-y-3">
          <div className="text-sm font-medium">Connect to {passwordSsid}</div>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="WiFi password"
            className="h-9"
            onKeyDown={(e) => {
              if (e.key === "Enter" && password) connectToWifi(passwordSsid, password);
            }}
          />
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="flex-1" onClick={clearPassword}>
              Cancel
            </Button>
            <Button
              size="sm"
              className="flex-1 gap-1.5"
              disabled={!password || connecting === passwordSsid}
              onClick={() => connectToWifi(passwordSsid, password)}
            >
              {connecting === passwordSsid ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <Check size={12} />
              )}
              Connect
            </Button>
          </div>
        </div>
      )}

      {/* Available networks */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-muted-foreground font-medium">Available Networks</span>
          <Button variant="ghost" size="icon-xs" onClick={scanWifi} disabled={scanning}>
            {scanning ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
          </Button>
        </div>
        <div className="space-y-1">
          {wifiList.length === 0 && !scanning && (
            <div className="text-sm text-muted-foreground text-center py-4">
              No networks found
            </div>
          )}
          {wifiList.map((net) => (
            <Button
              key={net.ssid}
              variant="outline"
              className="w-full justify-start h-auto px-3 py-2.5"
              onClick={() => handleNetworkTap(net)}
              disabled={net.connected || connecting !== null}
            >
              {signalIcon(net.signal)}
              <span className="text-sm flex-1 text-left truncate">{net.ssid}</span>
              {net.connected && (
                <Badge variant="default" className="text-[10px] h-5">Connected</Badge>
              )}
              {connecting === net.ssid && <Loader2 size={14} className="animate-spin" />}
              {net.security && net.security !== "" && net.security !== "--" && !net.connected && (
                <Lock size={12} className="text-muted-foreground" />
              )}
            </Button>
          ))}
        </div>
      </div>

      {/* Saved networks */}
      {saved.length > 0 && (
        <div>
          <div className="text-xs text-muted-foreground mb-2 font-medium">Saved Networks</div>
          <div className="space-y-1">
            {saved.map((s) => (
              <div
                key={s.name}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-border"
              >
                <Wifi size={14} className="text-muted-foreground shrink-0" />
                <span className="text-sm flex-1 truncate">{s.name}</span>
                <Button variant="ghost" size="icon-xs" onClick={() => forgetNetwork(s.name)}>
                  <Trash2 size={14} className="text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
