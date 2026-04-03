import { useEffect } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { AppShell } from "@/components/layout/AppShell";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import { useMoonraker } from "@/hooks/use-moonraker";

export default function App() {
  useMoonraker();

  useEffect(() => {
    getCurrentWindow().show();
  }, []);

  return (
    <ErrorBoundary>
      <AppShell />
    </ErrorBoundary>
  );
}
