import { useEffect, useRef } from "react";
import { TabBar } from "./TabBar";
import { StatusBar } from "./StatusBar";
import { useUiStore, type Tab } from "@/stores/ui-store";
import { usePrintStore } from "@/stores/print-store";
import { useKeyboardStore } from "@/stores/keyboard-store";
import { Dashboard } from "@/components/dashboard/Dashboard";
import { PrintPage } from "@/components/print/PrintPage";
import { ActionsPage } from "@/components/actions/ActionsPage";
import { MacrosPage } from "@/components/macros/MacrosPage";
import { SettingsPage } from "@/components/settings/SettingsPage";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { ConnectionOverlay } from "@/components/common/ConnectionOverlay";
import { VirtualKeyboard } from "@/components/common/VirtualKeyboard";

const pages: Record<Tab, React.ComponentType> = {
  dashboard: Dashboard,
  print: PrintPage,
  actions: ActionsPage,
  macros: MacrosPage,
  settings: SettingsPage,
};

export function AppShell() {
  const activeTab = useUiStore((s) => s.activeTab);
  const setActiveTab = useUiStore((s) => s.setActiveTab);
  const confirmDialog = useUiStore((s) => s.confirmDialog);
  const hideConfirm = useUiStore((s) => s.hideConfirm);
  const printMinimized = useUiStore((s) => s.printMinimized);
  const setPrintMinimized = useUiStore((s) => s.setPrintMinimized);
  const printState = usePrintStore((s) => s.print_stats.state);
  const printSummary = usePrintStore((s) => s.printSummary);
  const isPrinting = printState === "printing" || printState === "paused";
  const showingSummary = printSummary !== null;
  const keyboardVisible = useKeyboardStore((s) => s.visible);
  const keyboardHeight = useKeyboardStore((s) => s.height);
  const wasPrinting = useRef(false);
  const showTabBar = (!isPrinting || printMinimized) && !keyboardVisible;

  // Auto-switch to print tab when print starts; back to dashboard when it ends
  useEffect(() => {
    if (isPrinting && !wasPrinting.current) {
      setPrintMinimized(false);
      setActiveTab("print");
    }
    if (!isPrinting && wasPrinting.current && !showingSummary) {
      setPrintMinimized(false);
      setActiveTab("dashboard");
    }
    wasPrinting.current = isPrinting;
  }, [isPrinting, showingSummary, setActiveTab, setPrintMinimized]);

  // Un-minimize when user navigates to print tab
  useEffect(() => {
    if (activeTab === "print" && isPrinting && printMinimized) {
      setPrintMinimized(false);
    }
  }, [activeTab, isPrinting, printMinimized, setPrintMinimized]);

  return (
    <div className="flex flex-col h-full w-full overflow-hidden">
      <StatusBar />
      <div className="flex-1 relative overflow-hidden">
        {(Object.keys(pages) as Tab[]).map((tab) => {
          const Page = pages[tab];
          return (
            <div
              key={tab}
              className="absolute inset-0 overflow-y-auto"
              style={{
                display: activeTab === tab ? "block" : "none",
                bottom: keyboardVisible ? keyboardHeight : 0,
              }}
            >
              <Page />
            </div>
          );
        })}
        <VirtualKeyboard />
      </div>
      {showTabBar && <TabBar />}
      <ConnectionOverlay />
      {confirmDialog && (
        <ConfirmDialog
          title={confirmDialog.title}
          message={confirmDialog.message}
          imageUrl={confirmDialog.imageUrl}
          onConfirm={() => {
            confirmDialog.onConfirm();
            hideConfirm();
          }}
          onCancel={hideConfirm}
        />
      )}
    </div>
  );
}
