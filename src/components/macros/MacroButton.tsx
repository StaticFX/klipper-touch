import { type MacroConfig } from "@/lib/config";
import { useGcode } from "@/hooks/use-gcode";
import { useUiStore } from "@/stores/ui-store";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export function MacroButton({ macro }: { macro: MacroConfig }) {
  const { send, busy } = useGcode();
  const showConfirm = useUiStore((s) => s.showConfirm);

  const handlePress = () => {
    if (macro.confirm) {
      showConfirm({
        title: "Run Macro",
        message: `Execute "${macro.name}"?`,
        onConfirm: () => send(macro.gcode),
      });
    } else {
      send(macro.gcode);
    }
  };

  return (
    <Button
      variant="secondary"
      size="xl"
      onClick={handlePress}
      disabled={busy}
      style={{
        backgroundColor: macro.color ? `${macro.color}20` : undefined,
        borderColor: macro.color ? `${macro.color}40` : undefined,
        color: macro.color ?? undefined,
      }}
    >
      {busy && <Loader2 size={14} className="animate-spin" />}
      {macro.name}
    </Button>
  );
}
