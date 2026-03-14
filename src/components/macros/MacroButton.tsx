import { type MacroConfig } from "@/lib/config";
import { useGcode } from "@/hooks/use-gcode";
import { useUiStore } from "@/stores/ui-store";

export function MacroButton({ macro }: { macro: MacroConfig }) {
  const { send } = useGcode();
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
    <button
      onClick={handlePress}
      className="min-h-[64px] rounded-lg border border-border text-sm font-medium
        active:scale-90 transition-transform"
      style={{
        backgroundColor: macro.color ? `${macro.color}20` : undefined,
        borderColor: macro.color ? `${macro.color}40` : undefined,
        color: macro.color ?? undefined,
      }}
    >
      {macro.name}
    </button>
  );
}
