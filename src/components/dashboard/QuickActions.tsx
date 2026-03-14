import { useGcode } from "@/hooks/use-gcode";
import { emergencyStop } from "@/lib/moonraker/client";
import { useUiStore } from "@/stores/ui-store";
import { Home, Snowflake, PowerOff, OctagonX } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export function QuickActions() {
  const { send } = useGcode();
  const showConfirm = useUiStore((s) => s.showConfirm);

  const actions: { label: string; icon: LucideIcon; className?: string; action: () => void }[] = [
    {
      label: "Home All",
      icon: Home,
      action: () => send("G28"),
    },
    {
      label: "Cooldown",
      icon: Snowflake,
      action: () => {
        send("M104 S0");
        send("M140 S0");
      },
    },
    {
      label: "Motors Off",
      icon: PowerOff,
      action: () => send("M84"),
    },
    {
      label: "E-STOP",
      icon: OctagonX,
      className: "bg-destructive/10 text-destructive border-destructive/30",
      action: () =>
        showConfirm({
          title: "Emergency Stop",
          message: "This will immediately stop the printer. Continue?",
          onConfirm: () => emergencyStop(),
        }),
    },
  ];

  return (
    <div className="grid grid-cols-4 gap-2">
      {actions.map((a) => {
        const Icon = a.icon;
        return (
          <button
            key={a.label}
            onClick={a.action}
            className={`min-h-[48px] rounded-lg border border-border text-sm font-medium
              flex flex-col items-center justify-center gap-1
              active:scale-95 transition-transform
              ${a.className ?? "bg-secondary text-secondary-foreground"}`}
          >
            <Icon size={18} />
            <span className="text-xs">{a.label}</span>
          </button>
        );
      })}
    </div>
  );
}
