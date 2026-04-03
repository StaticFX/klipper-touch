import { useState } from "react";
import { MovementSection } from "./MovementSection";
import { TemperatureSection } from "./TemperatureSection";
import { FanSection } from "./FanSection";
import { ExtruderSection } from "./ExtruderSection";
import { BedMeshSection } from "./BedMeshSection";
import { RetractionSection } from "./RetractionSection";
import { InputShaperSection } from "./InputShaperSection";
import { UtilitySection } from "./UtilitySection";
import { EndstopsSection } from "./EndstopsSection";
import { BedLevelingSection } from "./BedLevelingSection";
import { useSubmenu } from "@/hooks/use-submenu";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Move, Thermometer, Fan, Cylinder, Grid3X3, Undo2, Activity, Wrench, CircleDot, Ruler, Settings } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type SectionMode = "controls" | "settings";

interface SubMenu {
  id: string;
  title: string;
  icon: LucideIcon;
  component: React.ComponentType<{ mode: SectionMode }>;
  hasSettings: boolean;
}

const submenus: SubMenu[] = [
  { id: "move", title: "Movement", icon: Move, component: MovementSection, hasSettings: true },
  { id: "temp", title: "Temperature", icon: Thermometer, component: TemperatureSection, hasSettings: true },
  { id: "fan", title: "Fan Control", icon: Fan, component: FanSection, hasSettings: true },
  { id: "extruder", title: "Extruder", icon: Cylinder, component: ExtruderSection, hasSettings: true },
  { id: "bedmesh", title: "Bed Mesh", icon: Grid3X3, component: BedMeshSection, hasSettings: false },
  { id: "bedlevel", title: "Bed Leveling", icon: Ruler, component: BedLevelingSection, hasSettings: false },
  { id: "retraction", title: "Retraction / PA", icon: Undo2, component: RetractionSection, hasSettings: false },
  { id: "shaper", title: "Input Shaper", icon: Activity, component: InputShaperSection, hasSettings: false },
  { id: "endstops", title: "Endstops", icon: CircleDot, component: EndstopsSection, hasSettings: false },
  { id: "utility", title: "Utilities", icon: Wrench, component: UtilitySection, hasSettings: true },
];

export function ActionsPage() {
  const { active, setActive, goBack } = useSubmenu();
  const [mode, setMode] = useState<SectionMode>("controls");

  const current = submenus.find((s) => s.id === active);

  if (current) {
    const Component = current.component;
    return (
      <div className="flex flex-col h-full">
        <Button
          variant="ghost"
          className="justify-start rounded-none border-b border-border shrink-0 text-muted-foreground"
          onClick={() => {
            if (mode === "settings") {
              setMode("controls");
            } else {
              goBack();
            }
          }}
        >
          <ChevronLeft size={16} />
          {mode === "settings" ? `${current.title} Settings` : current.title}
        </Button>
        <div className="flex-1 relative overflow-hidden">
          <div className="absolute inset-0 overflow-y-auto p-3">
            <Component mode={mode} />
          </div>
          {/* Floating settings gear */}
          {current.hasSettings && mode === "controls" && (
            <Button
              variant="secondary"
              size="icon"
              className="absolute bottom-3 right-3 rounded-full shadow-lg z-10"
              onClick={() => setMode("settings")}
            >
              <Settings size={18} />
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {submenus.map((item) => {
        const Icon = item.icon;
        return (
          <Button
            key={item.id}
            variant="ghost"
            className="justify-start rounded-none px-4 py-3.5 h-auto border-b border-border"
            onClick={() => { setActive(item.id); setMode("controls"); }}
          >
            <Icon size={18} className="text-muted-foreground shrink-0" />
            <span className="flex-1 text-sm font-medium text-left">{item.title}</span>
            <ChevronRight size={16} className="text-muted-foreground" />
          </Button>
        );
      })}
    </div>
  );
}
