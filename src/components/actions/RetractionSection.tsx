import { useState } from "react";
import { usePrinterStore } from "@/stores/printer-store";
import { setPressureAdvance, setRetraction } from "@/lib/moonraker/client";
import { NumericKeypad } from "@/components/common/NumericKeypad";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import type { SectionMode } from "./ActionsPage";

const PA_PRESETS = [0, 0.02, 0.04, 0.06, 0.08, 0.10];

export function RetractionSection({ mode: _mode }: { mode: SectionMode }) {
  const pa = usePrinterStore((s) => s.extruder.pressure_advance ?? 0);
  const fw = usePrinterStore((s) => s.firmwareRetraction);

  const [localPa, setLocalPa] = useState<number | null>(null);
  const [localRetLen, setLocalRetLen] = useState<number | null>(null);
  const [localRetSpd, setLocalRetSpd] = useState<number | null>(null);
  const [localUnretLen, setLocalUnretLen] = useState<number | null>(null);
  const [localUnretSpd, setLocalUnretSpd] = useState<number | null>(null);

  const [keypad, setKeypad] = useState<{
    title: string; value: number; min: number; max: number; unit: string; decimals?: number;
    onSubmit: (v: number) => void;
  } | null>(null);

  const displayPa = localPa ?? pa;

  return (
    <div className="space-y-3">
      {/* Pressure Advance */}
      <Card>
        <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Pressure Advance</div>
        <div className="flex items-center justify-between mb-3">
          <span className="text-2xl font-bold tabular-nums">{displayPa.toFixed(3)}</span>
          <Button variant="outline" size="xs" onClick={() => setKeypad({
            title: "Pressure Advance", value: pa, min: 0, max: 1.5, unit: "", decimals: 3,
            onSubmit: (v) => { setPressureAdvance(v); setKeypad(null); },
          })}>
            Type value
          </Button>
        </div>
        <Slider
          min={0} max={0.15} step={0.001}
          value={[localPa ?? pa]}
          onValueChange={([v]) => setLocalPa(v)}
          onValueCommit={([v]) => { setLocalPa(null); setPressureAdvance(v); }}
          className="mb-3"
        />
        <div className="flex flex-wrap gap-1.5">
          {PA_PRESETS.map((v) => (
            <Button
              key={v}
              variant={Math.abs(pa - v) < 0.001 ? "default" : "secondary"}
              size="xs"
              onClick={() => { setLocalPa(null); setPressureAdvance(v); }}
            >
              {v === 0 ? "Off" : v.toFixed(2)}
            </Button>
          ))}
        </div>
      </Card>

      {/* Firmware Retraction */}
      {fw ? (
        <Card>
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-3">Firmware Retraction</div>

          <SliderRow
            label="Retract Length"
            value={localRetLen ?? fw.retract_length}
            displayValue={`${(localRetLen ?? fw.retract_length).toFixed(2)} mm`}
            min={0} max={5} step={0.1}
            onChange={setLocalRetLen}
            onCommit={(v) => { setLocalRetLen(null); setRetraction({ retract_length: v }); }}
            onType={() => setKeypad({
              title: "Retract Length", value: fw.retract_length, min: 0, max: 10, unit: "mm", decimals: 2,
              onSubmit: (v) => { setRetraction({ retract_length: v }); setKeypad(null); },
            })}
          />

          <SliderRow
            label="Retract Speed"
            value={localRetSpd ?? fw.retract_speed}
            displayValue={`${Math.round(localRetSpd ?? fw.retract_speed)} mm/s`}
            min={1} max={100} step={1}
            onChange={setLocalRetSpd}
            onCommit={(v) => { setLocalRetSpd(null); setRetraction({ retract_speed: v }); }}
            onType={() => setKeypad({
              title: "Retract Speed", value: fw.retract_speed, min: 1, max: 200, unit: "mm/s",
              onSubmit: (v) => { setRetraction({ retract_speed: v }); setKeypad(null); },
            })}
          />

          <SliderRow
            label="Unretract Extra"
            value={localUnretLen ?? fw.unretract_extra_length}
            displayValue={`${(localUnretLen ?? fw.unretract_extra_length).toFixed(2)} mm`}
            min={0} max={2} step={0.05}
            onChange={setLocalUnretLen}
            onCommit={(v) => { setLocalUnretLen(null); setRetraction({ unretract_extra_length: v }); }}
            onType={() => setKeypad({
              title: "Unretract Extra", value: fw.unretract_extra_length, min: 0, max: 5, unit: "mm", decimals: 2,
              onSubmit: (v) => { setRetraction({ unretract_extra_length: v }); setKeypad(null); },
            })}
          />

          <SliderRow
            label="Unretract Speed"
            value={localUnretSpd ?? fw.unretract_speed}
            displayValue={`${Math.round(localUnretSpd ?? fw.unretract_speed)} mm/s`}
            min={1} max={100} step={1}
            onChange={setLocalUnretSpd}
            onCommit={(v) => { setLocalUnretSpd(null); setRetraction({ unretract_speed: v }); }}
            onType={() => setKeypad({
              title: "Unretract Speed", value: fw.unretract_speed, min: 1, max: 200, unit: "mm/s",
              onSubmit: (v) => { setRetraction({ unretract_speed: v }); setKeypad(null); },
            })}
          />
        </Card>
      ) : (
        <div className="text-xs text-muted-foreground text-center py-4 bg-card border border-border rounded-xl">
          Firmware retraction not enabled in printer config.
        </div>
      )}

      <p className="text-[11px] text-muted-foreground text-center">
        Changes apply immediately. Use SAVE_CONFIG to make permanent.
      </p>

      {keypad && (
        <NumericKeypad
          title={keypad.title}
          initialValue={keypad.value}
          unit={keypad.unit}
          min={keypad.min}
          max={keypad.max}
          allowDecimal={true}
          onSubmit={keypad.onSubmit}
          onCancel={() => setKeypad(null)}
        />
      )}
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="bg-card border border-border rounded-xl px-3 py-2.5">{children}</div>;
}

function SliderRow({ label, value, displayValue, min, max, step, onChange, onCommit, onType }: {
  label: string;
  value: number;
  displayValue: string;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  onCommit: (v: number) => void;
  onType: () => void;
}) {
  return (
    <div className="mb-3 last:mb-0">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-muted-foreground">{label}</span>
        <button onClick={onType} className="text-sm font-bold tabular-nums active:text-primary transition-colors">
          {displayValue}
        </button>
      </div>
      <Slider
        min={min} max={max} step={step}
        value={[value]}
        onValueChange={([v]) => onChange(v)}
        onValueCommit={([v]) => onCommit(v)}
      />
    </div>
  );
}
