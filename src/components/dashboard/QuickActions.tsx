import { useGcode } from "@/hooks/use-gcode";
import { emergencyStop } from "@/lib/moonraker/client";
import { useUiStore } from "@/stores/ui-store";
import { Button } from "@/components/ui/button";
import { Home, Snowflake, PowerOff, OctagonX } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export function QuickActions() {
  const { send } = useGcode();
  const showConfirm = useUiStore((s) => s.showConfirm);
  const estopConfirm = useUiStore((s) => s.estopConfirm);

  const actions: { label: string; icon: LucideIcon; variant?: "secondary" | "destructive-subtle"; action: () => void }[] = [
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
      variant: "destructive-subtle" as const,
      action: () => {
        if (estopConfirm) {
          showConfirm({
            title: "Emergency Stop",
            message: "This will immediately stop the printer. Continue?",
            onConfirm: () => emergencyStop(),
          });
        } else {
          emergencyStop();
        }
      },
    },
  ];

  return (
    <div className="grid grid-cols-4 gap-2">
      {actions.map((a) => {
        const Icon = a.icon;
        return (
          <Button
            key={a.label}
            variant={a.variant ?? "secondary"}
            className="h-auto min-h-[48px] flex-col gap-1 px-2"
            onClick={a.action}
          >
            <Icon size={18} />
            <span className="text-xs">{a.label}</span>
          </Button>
        );
      })}
    </div>
  );
}
