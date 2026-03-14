import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useUiStore } from "@/stores/ui-store";
import { usePrinterStore } from "@/stores/printer-store";
import { checkForUpdate, REPO_URL, type UpdateInfo } from "@/lib/update-checker";
import {
  ChevronLeft, ChevronRight, Sun, Moon, Wifi, RefreshCw, Info, Palette,
  PlugZap, ExternalLink, ArrowUpCircle, Loader2,
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
  const [update, setUpdate] = useState<UpdateInfo | null>(null);
  const [checking, setChecking] = useState(false);

  const check = () => {
    setChecking(true);
    checkForUpdate()
      .then(setUpdate)
      .finally(() => setChecking(false));
  };

  useEffect(() => { check(); }, []);

  return (
    <div className="space-y-4">
      <div className="text-center py-4 space-y-1">
        <div className="text-sm font-semibold">Klipper Touch</div>
        <div className="text-xs text-muted-foreground">
          {update ? `v${update.currentVersion}` : "..."}
        </div>
      </div>

      {/* Update status */}
      <div className="rounded-xl border border-border bg-muted/30 p-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Updates</span>
          <Button variant="ghost" size="sm" className="h-8 text-xs gap-1.5" disabled={checking} onClick={check}>
            {checking ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
            Check
          </Button>
        </div>
        {update && (
          <>
            <InfoRow label="Installed" value={`v${update.currentVersion}`} />
            <InfoRow
              label="Latest"
              value={update.latestVersion ? `v${update.latestVersion}` : "Unknown"}
            />
            {update.updateAvailable && (
              <div className="flex items-center gap-2 mt-1 p-2 rounded-lg bg-primary/10 border border-primary/20">
                <ArrowUpCircle size={16} className="text-primary shrink-0" />
                <span className="text-xs text-primary font-medium flex-1">
                  Update available: v{update.latestVersion}
                </span>
              </div>
            )}
            {update.latestVersion && !update.updateAvailable && (
              <div className="text-xs text-muted-foreground mt-1">
                You are running the latest version.
              </div>
            )}
          </>
        )}
      </div>

      {/* Links */}
      <div className="space-y-1.5">
        <a
          href={REPO_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-border active:bg-accent/50"
        >
          <ExternalLink size={14} className="text-muted-foreground" />
          <span className="text-sm flex-1">GitHub Repository</span>
          <ChevronRight size={14} className="text-muted-foreground" />
        </a>
        {update?.releaseUrl && (
          <a
            href={update.releaseUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-border active:bg-accent/50"
          >
            <ExternalLink size={14} className="text-muted-foreground" />
            <span className="text-sm flex-1">Latest Release</span>
            <ChevronRight size={14} className="text-muted-foreground" />
          </a>
        )}
      </div>
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
