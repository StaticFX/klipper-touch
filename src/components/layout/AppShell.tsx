import { TabBar } from "./TabBar";
import { StatusBar } from "./StatusBar";
import { useUiStore, type Tab } from "@/stores/ui-store";
import { Dashboard } from "@/components/dashboard/Dashboard";
import { PrintPage } from "@/components/print/PrintPage";
import { ActionsPage } from "@/components/actions/ActionsPage";
import { MacrosPage } from "@/components/macros/MacrosPage";
import { SettingsPage } from "@/components/settings/SettingsPage";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { ConnectionOverlay } from "@/components/common/ConnectionOverlay";

const pages: Record<Tab, React.ComponentType> = {
  dashboard: Dashboard,
  print: PrintPage,
  actions: ActionsPage,
  macros: MacrosPage,
  settings: SettingsPage,
};

export function AppShell() {
  const activeTab = useUiStore((s) => s.activeTab);
  const confirmDialog = useUiStore((s) => s.confirmDialog);
  const hideConfirm = useUiStore((s) => s.hideConfirm);

  return (
    <div className="flex flex-col h-screen max-h-screen w-full overflow-hidden">
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
      <TabBar />
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
