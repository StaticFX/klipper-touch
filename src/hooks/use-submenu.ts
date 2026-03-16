import { useState, useEffect, useCallback } from "react";
import { useUiStore } from "@/stores/ui-store";

/** Manages submenu navigation with auto-reset when the tab is re-clicked or switched. */
export function useSubmenu() {
  const [active, setActive] = useState<string | null>(null);
  const activeTab = useUiStore((s) => s.activeTab);
  const tabClickCount = useUiStore((s) => s.tabClickCount);

  useEffect(() => {
    setActive(null);
  }, [activeTab, tabClickCount]);

  const goBack = useCallback(() => setActive(null), []);

  return { active, setActive, goBack };
}
