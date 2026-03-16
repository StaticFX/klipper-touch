import { useUiStore, type Tab } from "@/stores/ui-store";
import { cn } from "@/lib/utils";
import { Home, Play, SlidersHorizontal, Zap, Settings } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const tabs: { id: Tab; label: string; icon: LucideIcon }[] = [
  { id: "dashboard", label: "Home", icon: Home },
  { id: "print", label: "Print", icon: Play },
  { id: "actions", label: "Actions", icon: SlidersHorizontal },
  { id: "macros", label: "Macros", icon: Zap },
  { id: "settings", label: "Settings", icon: Settings },
];

export function TabBar() {
  const activeTab = useUiStore((s) => s.activeTab);
  const setActiveTab = useUiStore((s) => s.setActiveTab);

  return (
    <nav className="flex items-stretch border-t border-border bg-card/80 backdrop-blur-sm">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const active = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex-1 flex flex-col items-center justify-center py-2 min-h-[52px]",
              "transition-all duration-150 active:scale-[0.97] active:opacity-80",
              active
                ? "text-primary"
                : "text-muted-foreground"
            )}
          >
            <Icon size={20} strokeWidth={active ? 2.5 : 1.8} />
            <span className={cn("text-[10px] mt-0.5", active && "font-medium")}>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
