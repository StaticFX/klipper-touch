import { useCallback, useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { setFanSpeed, setGenericFanSpeed } from "@/lib/moonraker/client";
import { usePrinterStore, type FanInfo } from "@/stores/printer-store";
import { useFanConfigStore } from "@/stores/fan-config-store";
import { NumericKeypad } from "@/components/common/NumericKeypad";
import type { SectionMode } from "./ActionsPage";
import { Fan, Plus, X } from "lucide-react";

function fanMeta(key: string): { label: string; controllable: boolean; type: string } {
  if (key === "fan") return { label: "Part Cooling", controllable: true, type: "fan" };
  if (key.startsWith("fan_generic "))
    return { label: key.replace("fan_generic ", ""), controllable: true, type: "fan_generic" };
  if (key.startsWith("heater_fan "))
    return { label: key.replace("heater_fan ", ""), controllable: false, type: "heater_fan" };
  if (key.startsWith("controller_fan "))
    return { label: key.replace("controller_fan ", ""), controllable: false, type: "controller_fan" };
  if (key.startsWith("temperature_fan "))
    return { label: key.replace("temperature_fan ", ""), controllable: false, type: "temperature_fan" };
  return { label: key, controllable: false, type: "unknown" };
}

/* ── Settings ────────────────────────────────────────── */

function FanSettings() {
  const speedPresets = useFanConfigStore((s) => s.speedPresets);
  const setSpeedPresets = useFanConfigStore((s) => s.setSpeedPresets);
  const [keypad, setKeypad] = useState<{ index: number } | null>(null);

  const removePreset = (index: number) => {
    setSpeedPresets(speedPresets.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      <div className="text-sm font-medium">Fan Settings</div>

      <div>
        <div className="text-[11px] text-muted-foreground mb-1.5">Speed Presets (%)</div>
        <div className="flex flex-wrap gap-1.5">
          {speedPresets.map((p, i) => (
            <Button
              key={i}
              variant="outline"
              className="h-10 text-xs"
              onClick={() => setKeypad({ index: i })}
            >
              {p === 0 ? "Off" : `${p}%`}
              {p !== 0 && (
                <span
                  className="ml-1 text-muted-foreground"
                  onClick={(e) => { e.stopPropagation(); removePreset(i); }}
                >
                  <X size={10} />
                </span>
              )}
            </Button>
          ))}
          <Button variant="outline" className="h-10 text-xs" onClick={() => setKeypad({ index: -1 })}>
            <Plus size={12} />
          </Button>
        </div>
      </div>

      {keypad && (
        <NumericKeypad
          title="Fan Speed Preset"
          initialValue={keypad.index >= 0 ? speedPresets[keypad.index] : 0}
          unit="%"
          min={0}
          max={100}
          onSubmit={(v) => {
            if (keypad.index >= 0) {
              const next = [...speedPresets];
              next[keypad.index] = v;
              setSpeedPresets(next);
            } else {
              setSpeedPresets([...speedPresets, v].sort((a, b) => a - b));
            }
            setKeypad(null);
          }}
          onCancel={() => setKeypad(null)}
        />
      )}
    </div>
  );
}

/* ── Main controls ───────────────────────────────────── */

export function FanSection({ mode }: { mode: SectionMode }) {
  const fans = usePrinterStore((s) => s.fans);

  const loaded = useFanConfigStore((s) => s.loaded);
  const loadFromConfig = useFanConfigStore((s) => s.loadFromConfig);
  const speedPresets = useFanConfigStore((s) => s.speedPresets);

  useEffect(() => {
    if (!loaded) loadFromConfig();
  }, [loaded, loadFromConfig]);

  if (mode === "settings") return <FanSettings />;

  const entries = Object.entries(fans).sort((a, b) => {
    if (a[0] === "fan") return -1;
    if (b[0] === "fan") return 1;
    const am = fanMeta(a[0]);
    const bm = fanMeta(b[0]);
    if (am.controllable !== bm.controllable) return am.controllable ? -1 : 1;
    return am.label.localeCompare(bm.label);
  });

  if (entries.length === 0) {
    return <div className="text-sm text-muted-foreground py-4 text-center">No fans detected</div>;
  }

  return (
    <div className="space-y-5">
      {entries.map(([key, info]) => (
        <FanRow key={key} fanKey={key} info={info} speedPresets={speedPresets} />
      ))}
    </div>
  );
}

function FanRow({ fanKey, info, speedPresets }: { fanKey: string; info: FanInfo; speedPresets: number[] }) {
  const meta = fanMeta(fanKey);
  const pct = Math.round(info.speed * 100);
  const [localPct, setLocalPct] = useState<number | null>(null);
  const dragging = useRef(false);

  const applySpeed = useCallback(
    (percent: number) => {
      const speed01 = percent / 100;
      if (fanKey === "fan") {
        setFanSpeed(speed01);
      } else if (meta.type === "fan_generic") {
        const name = fanKey.replace("fan_generic ", "");
        setGenericFanSpeed(name, speed01);
      }
    },
    [fanKey, meta.type]
  );

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <Fan
            size={14}
            className={pct > 0 ? "text-cyan-500 animate-spin" : "text-muted-foreground"}
            style={pct > 0 ? { animationDuration: `${Math.max(0.3, 2 - pct / 60)}s` } : undefined}
          />
          <span className="text-sm font-medium truncate">{meta.label}</span>
          {!meta.controllable && (
            <span className="text-[10px] text-muted-foreground">(auto)</span>
          )}
        </div>
        <span className="text-sm font-semibold tabular-nums w-12 text-right">{pct}%</span>
      </div>

      {meta.controllable ? (
        <>
          <Slider
            min={0}
            max={100}
            step={1}
            value={[localPct ?? pct]}
            onValueChange={([v]) => {
              dragging.current = true;
              setLocalPct(v);
            }}
            onValueCommit={([v]) => {
              dragging.current = false;
              setLocalPct(null);
              applySpeed(v);
            }}
            className="py-2"
          />
          <div className="flex gap-1.5">
            {speedPresets.map((p) => (
              <Button
                key={p}
                variant={pct === p ? "default" : "outline"}
                className="flex-1 h-10 text-xs"
                onClick={() => applySpeed(p)}
              >
                {p === 0 ? "Off" : `${p}%`}
              </Button>
            ))}
          </div>
        </>
      ) : (
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full bg-cyan-500/60 rounded-full"
            style={{ width: `${pct}%` }}
          />
        </div>
      )}

      {info.rpm != null && (
        <div className="text-[10px] text-muted-foreground">{info.rpm} RPM</div>
      )}
    </div>
  );
}
