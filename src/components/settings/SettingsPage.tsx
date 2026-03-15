import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useUiStore } from "@/stores/ui-store";
import { usePrinterStore } from "@/stores/printer-store";
import { usePrintStore } from "@/stores/print-store";
import { checkForUpdate, REPO_URL, type UpdateInfo } from "@/lib/update-checker";
import {
  ChevronLeft, ChevronRight, Sun, Moon, Wifi, RefreshCw, Info,
  PlugZap, ExternalLink, ArrowUpCircle, Loader2, Download, Bug,
  Monitor, Thermometer, Eye, EyeOff,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { UpdateModal } from "./UpdateModal";

interface NetworkInfo {
  hostname: string;
  ip_address: string | null;
  wifi_ssid: string | null;
  wifi_signal: string | null;
}

/* ── Sub-pages ────────────────────────────────────────── */

function KlipperTouchSub() {
  const theme = useUiStore((s) => s.theme);
  const toggleTheme = useUiStore((s) => s.toggleTheme);
  const hiddenSensors = useUiStore((s) => s.hiddenSensors);
  const toggleSensor = useUiStore((s) => s.toggleSensor);
  const history = usePrinterStore((s) => s.temperatureHistory);
  const extraTemps = usePrinterStore((s) => s.extraTemps);

  // Discover all known sensors from history + extraTemps
  const allSensors: string[] = (() => {
    const keys = new Set<string>();
    keys.add("extruder");
    keys.add("bed");
    for (const k of Object.keys(extraTemps)) keys.add(k);
    if (history.length > 0) {
      for (const k of Object.keys(history[history.length - 1].temps)) keys.add(k);
    }
    return Array.from(keys).sort();
  })();

  const sensorLabel = (key: string): string => {
    const parts = key.split(" ");
    if (parts.length > 1) {
      const name = parts.slice(1).join(" ");
      return name.charAt(0).toUpperCase() + name.slice(1);
    }
    return key.charAt(0).toUpperCase() + key.slice(1);
  };

  return (
    <div className="space-y-5">
      {/* Theme */}
      <div>
        <div className="text-xs text-muted-foreground mb-2 font-medium">Appearance</div>
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

      {/* Sensor visibility */}
      <div>
        <div className="text-xs text-muted-foreground mb-2 font-medium">Temperature Sensors</div>
        <p className="text-[11px] text-muted-foreground mb-3">
          Toggle which sensors appear on the dashboard graph.
        </p>
        <div className="space-y-1">
          {allSensors.map((key) => {
            const visible = !hiddenSensors.includes(key);
            return (
              <button
                key={key}
                onClick={() => toggleSensor(key)}
                className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg border border-border active:bg-accent/50"
              >
                {visible ? (
                  <Eye size={16} className="text-primary shrink-0" />
                ) : (
                  <EyeOff size={16} className="text-muted-foreground shrink-0" />
                )}
                <span className="text-sm flex-1 text-left">{sensorLabel(key)}</span>
                <Thermometer size={14} className="text-muted-foreground" />
              </button>
            );
          })}
        </div>
      </div>
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
  const [showUpdateModal, setShowUpdateModal] = useState(false);

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
              <div className="space-y-2 mt-1">
                <div className="flex items-center gap-2 p-2 rounded-lg bg-primary/10 border border-primary/20">
                  <ArrowUpCircle size={16} className="text-primary shrink-0" />
                  <span className="text-xs text-primary font-medium flex-1">
                    Update available: v{update.latestVersion}
                  </span>
                </div>
                <Button
                  className="w-full gap-2"
                  size="sm"
                  onClick={() => setShowUpdateModal(true)}
                >
                  <Download size={14} />
                  Install Update
                </Button>
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

      {showUpdateModal && (
        <UpdateModal onClose={() => setShowUpdateModal(false)} />
      )}
    </div>
  );
}

function DebugSub() {
  const printState = usePrintStore((s) => s.print_stats.state);
  const isMocked = printState === "printing";

  const toggleMockPrint = () => {
    if (isMocked) {
      usePrintStore.setState({
        print_stats: {
          state: "standby",
          filename: "",
          total_duration: 0,
          print_duration: 0,
          filament_used: 0,
          message: "",
        },
        display_status: { progress: 0, message: "" },
      });
    } else {
      usePrintStore.setState({
        print_stats: {
          state: "printing",
          filename: "benchy_0.2mm_PLA.gcode",
          total_duration: 5420,
          print_duration: 2710,
          filament_used: 4.832,
          message: "",
          info: { current_layer: 87, total_layer: 174 },
        },
        display_status: { progress: 0.50, message: "" },
      });
      usePrinterStore.setState({
        extruder: { temperature: 210.3, target: 215, power: 0.42, pressure_advance: 0.04 },
        heater_bed: { temperature: 59.8, target: 60, power: 0.15 },
        toolhead: {
          position: [120, 110, 14.2, 482],
          homed_axes: "xyz",
          max_velocity: 300,
          max_accel: 5000,
          square_corner_velocity: 5.0,
          print_time: 2710,
          estimated_print_time: 5420,
        },
        gcode_move: {
          gcode_position: [120, 110, 14.2, 482],
          homing_origin: [0, 0, 0, 0],
          speed: 3000,
          speed_factor: 1.0,
          extrude_factor: 1.0,
        },
        motionReport: {
          live_extruder_velocity: 3.2,
          live_velocity: 82,
          live_position: [120, 110, 14.2, 482],
        },
      });
    }
  };

  return (
    <div className="space-y-4">
      <InfoRow
        label="Mock Active Print"
        value={
          <Button variant="outline" size="sm" onClick={toggleMockPrint}>
            {isMocked ? "Stop Mock" : "Start Mock"}
          </Button>
        }
      />
      <p className="text-xs text-muted-foreground">
        Simulates an active print to preview the print screen UI.
      </p>
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
  { id: "klipper-touch", title: "Klipper Touch", icon: Monitor, component: KlipperTouchSub },
  { id: "connection", title: "Connection", icon: PlugZap, component: ConnectionSub },
  { id: "network", title: "Network", icon: Wifi, component: NetworkSub },
  { id: "about", title: "About", icon: Info, component: AboutSub },
  { id: "debug", title: "Debug", icon: Bug, component: DebugSub },
];

export function SettingsPage() {
  const [active, setActive] = useState<string | null>(null);
  const activeTab = useUiStore((s) => s.activeTab);
  const tabClickCount = useUiStore((s) => s.tabClickCount);

  // Reset submenu whenever user switches tabs or re-clicks Settings
  useEffect(() => {
    setActive(null);
  }, [activeTab, tabClickCount]);

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
            className="flex items-center gap-3 px-4 py-3.5 border-b border-border active:bg-accent/50"
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
