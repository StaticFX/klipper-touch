import { Button } from "@/components/ui/button";
import { useSubmenu } from "@/hooks/use-submenu";
import {
  ChevronLeft, ChevronRight, Wifi, Info, PlugZap, Bug, Monitor, Terminal, Gauge,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { KlipperTouchSettings } from "./KlipperTouchSettings";
import { ConnectionSettings } from "./ConnectionSettings";
import { NetworkSettings } from "./NetworkSettings";
import { LimitsSettings } from "./LimitsSettings";
import { AboutSettings } from "./AboutSettings";
import { DebugSettings } from "./DebugSettings";
import { ConsolePage } from "@/components/console/ConsolePage";

interface SubMenu {
  id: string;
  title: string;
  icon: LucideIcon;
  component: React.ComponentType;
  fullPage?: boolean;
}

const submenus: SubMenu[] = [
  { id: "console", title: "Terminal", icon: Terminal, component: ConsolePage, fullPage: true },
  { id: "klipper-touch", title: "Klipper Touch", icon: Monitor, component: KlipperTouchSettings },
  { id: "limits", title: "Printer Limits", icon: Gauge, component: LimitsSettings },
  { id: "connection", title: "Connection", icon: PlugZap, component: ConnectionSettings },
  { id: "network", title: "Network", icon: Wifi, component: NetworkSettings },
  { id: "about", title: "About", icon: Info, component: AboutSettings },
  ...(import.meta.env.DEV
    ? [{ id: "debug", title: "Debug", icon: Bug, component: DebugSettings } as const]
    : []),
];

export function SettingsPage() {
  const { active, setActive, goBack } = useSubmenu();

  const current = submenus.find((s) => s.id === active);

  if (current) {
    const Component = current.component;
    return (
      <div className="flex flex-col h-full">
        <Button
          variant="ghost"
          className="justify-start rounded-none border-b border-border shrink-0 text-muted-foreground"
          onClick={goBack}
        >
          <ChevronLeft size={16} />
          {current.title}
        </Button>
        {current.fullPage ? (
          <div className="flex-1 min-h-0">
            <Component />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-3">
            <Component />
          </div>
        )}
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
            onClick={() => setActive(item.id)}
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
