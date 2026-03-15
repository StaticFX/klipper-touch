import { useEffect, useRef } from "react";
import { TabBar } from "./TabBar";
import { StatusBar } from "./StatusBar";
import { useUiStore, type Tab } from "@/stores/ui-store";
import { usePrintStore } from "@/stores/print-store";
import { Dashboard } from "@/components/dashboard/Dashboard";
import { PrintPage } from "@/components/print/PrintPage";
import { ActionsPage } from "@/components/actions/ActionsPage";
import { MacrosPage } from "@/components/macros/MacrosPage";
import { ConsolePage } from "@/components/console/ConsolePage";
import { SettingsPage } from "@/components/settings/SettingsPage";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { ConnectionOverlay } from "@/components/common/ConnectionOverlay";
import { VirtualKeyboard } from "@/components/common/VirtualKeyboard";

const pages: Record<Tab, React.ComponentType> = {
  dashboard: Dashboard,
  print: PrintPage,
  actions: ActionsPage,
  macros: MacrosPage,
  console: ConsolePage,
  settings: SettingsPage,
};

export function AppShell() {
  const activeTab = useUiStore((s) => s.activeTab);
  const setActiveTab = useUiStore((s) => s.setActiveTab);
  const confirmDialog = useUiStore((s) => s.confirmDialog);
  const hideConfirm = useUiStore((s) => s.hideConfirm);
  const printState = usePrintStore((s) => s.print_stats.state);
  const printSummary = usePrintStore((s) => s.printSummary);
  const isPrinting = printState === "printing" || printState === "paused";
  const showingSummary = printSummary !== null;
  const wasPrinting = useRef(false);

  useEffect(() => {
    if (isPrinting && !wasPrinting.current) {
      setActiveTab("print");
    }
    if (!isPrinting && wasPrinting.current && !showingSummary) {
      setActiveTab("dashboard");
    }
    wasPrinting.current = isPrinting;
  }, [isPrinting, showingSummary, setActiveTab]);

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
              style={{ display: activeTab === tab ? "block" : "none" }}
            >
              <Page />
            </div>
          );
        })}
      </div>
      {!isPrinting && !showingSummary && <TabBar />}
      <VirtualKeyboard />
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
