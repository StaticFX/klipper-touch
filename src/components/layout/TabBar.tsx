import { useUiStore, type Tab } from "@/stores/ui-store";
import { cn } from "@/lib/utils";
import { Home, Play, SlidersHorizontal, Terminal, Settings } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const tabs: { id: Tab; label: string; icon: LucideIcon }[] = [
  { id: "dashboard", label: "Home", icon: Home },
  { id: "print", label: "Print", icon: Play },
  { id: "actions", label: "Actions", icon: SlidersHorizontal },
  { id: "macros", label: "Macros", icon: Terminal },
  { id: "settings", label: "Settings", icon: Settings },
];

export function TabBar() {
  const activeTab = useUiStore((s) => s.activeTab);
  const setActiveTab = useUiStore((s) => s.setActiveTab);

  return (
    <nav className="flex items-stretch border-t border-border bg-card">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex-1 flex flex-col items-center justify-center py-2 min-h-[52px]",
              "active:scale-95 active:bg-accent",
              activeTab === tab.id
                ? "text-primary"
                : "text-muted-foreground"
            )}
          >
            <Icon size={20} strokeWidth={activeTab === tab.id ? 2.5 : 2} />
            <span className="text-[10px] mt-0.5">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
