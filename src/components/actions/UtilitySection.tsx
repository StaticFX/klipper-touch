import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useGcode } from "@/hooks/use-gcode";
import { useUiStore } from "@/stores/ui-store";
import { useUtilityConfigStore } from "@/stores/utility-config-store";
import type { UtilityShortcut } from "@/lib/config";
import type { SectionMode } from "./ActionsPage";
import { Loader2, Plus, Trash2, Zap } from "lucide-react";

/* ── Settings ────────────────────────────────────────── */

function UtilitySettings() {
  const shortcuts = useUtilityConfigStore((s) => s.shortcuts);
  const setShortcuts = useUtilityConfigStore((s) => s.setShortcuts);
  const [editing, setEditing] = useState<{ index: number; name: string; gcode: string; confirm: boolean } | null>(null);

  const removeShortcut = (index: number) => {
    setShortcuts(shortcuts.filter((_, i) => i !== index));
  };

  const startAdd = () => {
    setEditing({ index: -1, name: "", gcode: "", confirm: false });
  };

  const startEdit = (index: number) => {
    const s = shortcuts[index];
    setEditing({ index, name: s.name, gcode: s.gcode, confirm: s.confirm });
  };

  const saveEdit = () => {
    if (!editing || !editing.name.trim() || !editing.gcode.trim()) return;
    const entry: UtilityShortcut = {
      name: editing.name.trim(),
      gcode: editing.gcode.trim(),
      confirm: editing.confirm,
    };
    if (editing.index >= 0) {
      const next = [...shortcuts];
      next[editing.index] = entry;
      setShortcuts(next);
    } else {
      setShortcuts([...shortcuts, entry]);
    }
    setEditing(null);
  };

  return (
    <div className="space-y-4">
      <div className="text-sm font-medium">Utility Shortcuts</div>

      <div className="space-y-1.5">
        {shortcuts.map((s, i) => (
          <div
            key={i}
            className="flex items-center gap-2 rounded-xl border border-border px-3 py-2.5 bg-card"
          >
            <button
              className="flex-1 text-left min-w-0"
              onClick={() => startEdit(i)}
            >
              <div className="text-sm font-medium truncate">{s.name}</div>
              <div className="text-[10px] text-muted-foreground font-mono truncate">{s.gcode}</div>
            </button>
            <span className="text-[10px] text-muted-foreground shrink-0">
              {s.confirm ? "confirm" : ""}
            </span>
            <Button
              variant="ghost"
              size="icon-xs"
              className="text-destructive shrink-0"
              onClick={() => removeShortcut(i)}
            >
              <Trash2 size={12} />
            </Button>
          </div>
        ))}
      </div>

      <Button variant="outline" className="w-full h-10 text-xs" onClick={startAdd}>
        <Plus size={14} />
        Add Shortcut
      </Button>

      {/* Inline editor */}
      {editing && (
        <div className="space-y-2 rounded-xl border border-border p-3 bg-card">
          <div className="text-xs font-medium">
            {editing.index >= 0 ? "Edit Shortcut" : "New Shortcut"}
          </div>
          <Input
            value={editing.name}
            onChange={(e) => setEditing((prev) => prev ? { ...prev, name: e.target.value } : prev)}
            placeholder="Name (e.g. Motors Off)"
            className="h-10 text-sm"
            autoComplete="off"
          />
          <Input
            value={editing.gcode}
            onChange={(e) => setEditing((prev) => prev ? { ...prev, gcode: e.target.value.toUpperCase() } : prev)}
            placeholder="G-code or Macro (e.g. M84)"
            className="h-10 font-mono text-sm"
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
          />
          <div className="flex items-center gap-2">
            <Button
              variant={editing.confirm ? "default" : "outline"}
              size="sm"
              onClick={() => setEditing((prev) => prev ? { ...prev, confirm: !prev.confirm } : prev)}
            >
              {editing.confirm ? "Confirm: On" : "Confirm: Off"}
            </Button>
            <div className="flex-1" />
            <Button variant="ghost" size="sm" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!editing.name.trim() || !editing.gcode.trim()}
              onClick={saveEdit}
            >
              Save
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Main controls ───────────────────────────────────── */

export function UtilitySection({ mode }: { mode: SectionMode }) {
  const { send, busy } = useGcode();
  const showConfirm = useUiStore((s) => s.showConfirm);

  const loaded = useUtilityConfigStore((s) => s.loaded);
  const loadFromConfig = useUtilityConfigStore((s) => s.loadFromConfig);
  const shortcuts = useUtilityConfigStore((s) => s.shortcuts);

  useEffect(() => {
    if (!loaded) loadFromConfig();
  }, [loaded, loadFromConfig]);

  if (mode === "settings") return <UtilitySettings />;

  const runShortcut = (s: UtilityShortcut) => {
    if (s.confirm) {
      showConfirm({
        title: s.name,
        message: `Run ${s.gcode}?`,
        onConfirm: () => send(s.gcode),
      });
    } else {
      send(s.gcode);
    }
  };

  if (shortcuts.length === 0) {
    return (
      <div className="text-sm text-muted-foreground py-8 text-center">
        No shortcuts configured. Open settings to add some.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-2">
      {shortcuts.map((s, i) => (
        <Button
          key={i}
          variant="outline"
          className="h-14 flex-col gap-1 text-xs"
          disabled={busy}
          onClick={() => runShortcut(s)}
        >
          {busy ? <Loader2 size={18} className="animate-spin" /> : <Zap size={18} />}
          {s.name}
        </Button>
      ))}
    </div>
  );
}
