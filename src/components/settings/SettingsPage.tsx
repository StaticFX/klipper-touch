import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useUiStore } from "@/stores/ui-store";
import { usePrinterStore } from "@/stores/printer-store";
import {
  ChevronLeft, ChevronRight, Sun, Moon, Wifi, RefreshCw, Info, Palette,
  PlugZap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface NetworkInfo {
  hostname: string;
  ip_address: string | null;
  wifi_ssid: string | null;
  wifi_signal: string | null;
}

/* ── Sub-pages ────────────────────────────────────────── */

function AppearanceSub() {
  const theme = useUiStore((s) => s.theme);
  const toggleTheme = useUiStore((s) => s.toggleTheme);

  return (
    <div className="space-y-4">
      <InfoRow
        label="Theme"
        value={
          <Button variant="outline" size="sm" onClick={toggleTheme} className="gap-2">
            {theme === "light" ? <Sun size={14} /> : <Moon size={14} />}
            {theme === "light" ? "Light" : "Dark"}
          </Button>
        }
      />
    </div>
  );
}

function ConnectionSub() {
  const moonraker = usePrinterStore((s) => s.moonrakerConnected);
  const klippy = usePrinterStore((s) => s.klippyState);

  return (
    <div className="space-y-3">
      <InfoRow
        label="Moonraker"
        value={
          <Badge variant={moonraker ? "default" : "destructive"}>
            {moonraker ? "Connected" : "Disconnected"}
          </Badge>
        }
      />
      <InfoRow
        label="Klipper"
        value={
          <Badge variant={klippy === "ready" ? "default" : "secondary"}>
            {klippy}
          </Badge>
        }
      />
    </div>
  );
}

function NetworkSub() {
  const [network, setNetwork] = useState<NetworkInfo | null>(null);

  const refresh = () => {
    invoke<NetworkInfo>("get_network_info")
      .then(setNetwork)
      .catch(() => {});
  };

  useEffect(() => {
    refresh();
  }, []);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Network Info</span>
        <Button variant="ghost" size="icon-xs" onClick={refresh}>
          <RefreshCw size={12} />
        </Button>
      </div>
      {network ? (
        <div className="space-y-2">
          <InfoRow label="Hostname" value={network.hostname} />
          <InfoRow label="IP Address" value={network.ip_address ?? "N/A"} />
          <InfoRow label="WiFi" value={network.wifi_ssid ?? "N/A"} />
          <InfoRow label="Signal" value={network.wifi_signal ?? "N/A"} />
        </div>
      ) : (
        <span className="text-sm text-muted-foreground">Loading...</span>
      )}
    </div>
  );
}

function AboutSub() {
  return (
    <div className="text-center py-6 space-y-1">
      <div className="text-sm font-medium">Klipper Touch</div>
      <div className="text-xs text-muted-foreground">v0.1.0</div>
    </div>
  );
}

/* ── Main ─────────────────────────────────────────────── */

interface SubMenu {
  id: string;
  title: string;
  icon: LucideIcon;
  component: React.ComponentType;
}

const submenus: SubMenu[] = [
  { id: "appearance", title: "Appearance", icon: Palette, component: AppearanceSub },
  { id: "connection", title: "Connection", icon: PlugZap, component: ConnectionSub },
  { id: "network", title: "Network", icon: Wifi, component: NetworkSub },
  { id: "about", title: "About", icon: Info, component: AboutSub },
];

export function SettingsPage() {
  const [active, setActive] = useState<string | null>(null);

  const current = submenus.find((s) => s.id === active);

  if (current) {
    const Component = current.component;
    return (
      <div className="flex flex-col h-full">
        <button
          onClick={() => setActive(null)}
          className="flex items-center gap-2 px-3 py-3 text-sm font-medium text-muted-foreground active:bg-accent/50 border-b border-border shrink-0"
        >
          <ChevronLeft size={16} />
          {current.title}
        </button>
        <div className="flex-1 overflow-y-auto p-3">
          <Component />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {submenus.map((item) => {
        const Icon = item.icon;
        return (
          <button
            key={item.id}
            onClick={() => setActive(item.id)}
            className="flex items-center gap-3 px-4 py-3.5 border-b border-border active:bg-accent/50 transition-colors"
          >
            <Icon size={18} className="text-muted-foreground shrink-0" />
            <span className="flex-1 text-sm font-medium text-left">{item.title}</span>
            <ChevronRight size={16} className="text-muted-foreground" />
          </button>
        );
      })}
    </div>
  );
}

/* ── Helpers ───────────────────────────────────────────── */

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground">{label}</span>
      {typeof value === "string" ? (
        <span className="text-sm font-medium">{value}</span>
      ) : (
        value
      )}
    </div>
  );
}
