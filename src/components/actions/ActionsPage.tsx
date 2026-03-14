import { useState } from "react";
import { MovementSection } from "./MovementSection";
import { TemperatureSection } from "./TemperatureSection";
import { FanSection } from "./FanSection";
import { ExtruderSection } from "./ExtruderSection";
import { BedMeshSection } from "./BedMeshSection";
import { UtilitySection } from "./UtilitySection";
import { ChevronLeft, ChevronRight, Move, Thermometer, Fan, Cylinder, Grid3X3, Wrench } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface SubMenu {
  id: string;
  title: string;
  icon: LucideIcon;
  component: React.ComponentType;
}

const submenus: SubMenu[] = [
  { id: "move", title: "Movement", icon: Move, component: MovementSection },
  { id: "temp", title: "Temperature", icon: Thermometer, component: TemperatureSection },
  { id: "fan", title: "Fan Control", icon: Fan, component: FanSection },
  { id: "extruder", title: "Extruder", icon: Cylinder, component: ExtruderSection },
  { id: "bedmesh", title: "Bed Mesh", icon: Grid3X3, component: BedMeshSection },
  { id: "utility", title: "Utilities", icon: Wrench, component: UtilitySection },
];

export function ActionsPage() {
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
