import { useEffect, useState, useCallback } from "react";
import { getGcodeHelp, getMacroParams, sendGcode } from "@/lib/moonraker/client";
import { usePrinterStore } from "@/stores/printer-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Play, RefreshCw, ChevronLeft } from "lucide-react";

interface MacroInfo {
  name: string;
  description: string;
  params: Record<string, string>; // paramName → defaultValue
}

// Standard gcodes to filter out
const STANDARD_PREFIX = ["G0", "G1", "G2", "G3", "G4", "G10", "G11", "G20", "G21", "G28", "G80", "G90", "G91", "G92",
  "M0", "M1", "M3", "M4", "M5", "M17", "M18", "M25", "M73", "M82", "M83", "M84", "M104", "M105", "M106", "M107",
  "M109", "M112", "M114", "M115", "M117", "M118", "M119", "M140", "M141", "M143", "M150", "M190", "M191", "M200",
  "M201", "M202", "M203", "M204", "M205", "M206", "M207", "M208", "M220", "M221", "M226", "M280", "M290", "M300",
  "M400", "M401", "M402", "M486", "M500", "M501", "M502", "M503", "M600", "M900", "M907",
  "ACCEPT", "ABORT", "ADJUSTED_PROBE", "CALC_ESTIMATED_TIME",
  "DUMP_TMC", "EXCLUDE_OBJECT", "GET_", "INIT_TMC", "MANUAL_",
  "MEASURE_AXES_NOISE", "PAUSE", "PROBE", "QUERY_", "RESET_", "RESPOND",
  "RESTART", "RESUME", "SAVE_", "SDCARD_", "SET_", "STATUS", "STEPPER_BUZZ",
  "TESTZ", "TURN_OFF_HEATERS", "UPDATE_DELAYED_GCODE"];

function isStandardGcode(name: string): boolean {
  return STANDARD_PREFIX.some((p) => name.startsWith(p));
}

export function MacrosPage() {
  const [macros, setMacros] = useState<MacroInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [selected, setSelected] = useState<MacroInfo | null>(null);
  const [paramValues, setParamValues] = useState<Record<string, string>>({});
  const connected = usePrinterStore((s) => s.moonrakerConnected);
  const klippyReady = usePrinterStore((s) => s.klippyState) === "ready";

  const fetchMacros = useCallback(async () => {
    setLoading(true);
    try {
      const [help, allParams] = await Promise.all([getGcodeHelp(), getMacroParams()]);
      const list: MacroInfo[] = Object.entries(help)
        .filter(([name]) => !isStandardGcode(name))
        .map(([name, description]) => ({
          name,
          description,
          params: allParams[name] ?? {},
        }))
        .sort((a, b) => a.name.localeCompare(b.name));
      setMacros(list);
    } catch {
      setMacros([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (connected && klippyReady) fetchMacros();
  }, [connected, klippyReady, fetchMacros]);

  const filtered = filter
    ? macros.filter(
        (m) =>
          m.name.toLowerCase().includes(filter.toLowerCase()) ||
          m.description.toLowerCase().includes(filter.toLowerCase())
      )
    : macros;

  const handleRun = async (macro: MacroInfo) => {
    const parts = [macro.name];
    for (const [key, val] of Object.entries(paramValues)) {
      if (val.trim()) {
        parts.push(`${key}=${val.trim()}`);
      }
    }
    await sendGcode(parts.join(" "));
    setSelected(null);
    setParamValues({});
  };

  const openMacro = (macro: MacroInfo) => {
    setSelected(macro);
    // Pre-fill with defaults
    const defaults: Record<string, string> = {};
    for (const [key, val] of Object.entries(macro.params)) {
      defaults[key] = val;
    }
    setParamValues(defaults);
  };

  if (loading) {
    return <div className="p-3 text-center text-muted-foreground py-8">Loading macros...</div>;
  }

  // Detail view for a selected macro
  if (selected) {
    const hasParams = Object.keys(selected.params).length > 0;
    return (
      <div>
        <button
          onClick={() => { setSelected(null); setParamValues({}); }}
          className="sticky top-0 z-10 flex items-center gap-2 px-3 py-3 text-sm font-medium text-muted-foreground active:bg-accent/50 border-b border-border bg-background w-full"
        >
          <ChevronLeft size={16} />
          Macros
        </button>
        <div className="p-3 space-y-4">
          <div>
            <div className="text-base font-semibold font-mono">{selected.name}</div>
            {selected.description && (
              <div className="text-sm text-muted-foreground mt-1">{selected.description}</div>
            )}
          </div>

          {hasParams && (
            <div className="space-y-3">
              <div className="text-sm font-medium">Parameters</div>
              {Object.entries(selected.params).map(([key, defaultVal]) => (
                <div key={key} className="space-y-1">
                  <label className="text-xs text-muted-foreground font-mono">{key}</label>
                  <Input
                    value={paramValues[key] ?? ""}
                    onChange={(e) => setParamValues({ ...paramValues, [key]: e.target.value })}
                    placeholder={`Default: ${defaultVal}`}
                    className="h-9 font-mono text-sm"
                  />
                </div>
              ))}
            </div>
          )}

          <Button
            className="w-full h-11"
            onClick={() => handleRun(selected)}
          >
            <Play size={16} />
            Run {selected.name}
          </Button>
        </div>
      </div>
    );
  }

  // List view — uses parent scroll (no nested scroll container)
  return (
    <div className="p-3 space-y-3">
      {/* Search bar — sticky */}
      <div className="sticky top-0 z-10 bg-background pt-0 pb-1 flex gap-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search macros..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="pl-8 h-9"
          />
        </div>
        <Button variant="outline" size="icon" onClick={fetchMacros}>
          <RefreshCw size={14} />
        </Button>
      </div>

      {/* Macro count */}
      <div>
        <span className="text-xs text-muted-foreground">
          {filtered.length} macro{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Macro list */}
      <div className="space-y-1.5">
        {filtered.length === 0 ? (
          <div className="text-center text-muted-foreground py-8 text-sm">
            {filter ? "No macros match your search" : "No macros found on printer"}
          </div>
        ) : (
          filtered.map((macro) => (
            <Card key={macro.name} className="py-0 gap-0">
              <CardContent className="px-3 py-2.5">
                <button
                  className="w-full flex items-center gap-3 text-left"
                  onClick={() => openMacro(macro)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium font-mono truncate">{macro.name}</div>
                    {macro.description && (
                      <div className="text-xs text-muted-foreground truncate mt-0.5">
                        {macro.description}
                      </div>
                    )}
                    {Object.keys(macro.params).length > 0 && (
                      <div className="text-[10px] text-muted-foreground/70 mt-0.5">
                        Params: {Object.keys(macro.params).join(", ")}
                      </div>
                    )}
                  </div>
                  <Play size={14} className="text-muted-foreground shrink-0" />
                </button>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
