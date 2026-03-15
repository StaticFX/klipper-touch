import { useEffect } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { AppShell } from "@/components/layout/AppShell";
import { useMoonraker } from "@/hooks/use-moonraker";

export default function App() {
  useMoonraker();

  useEffect(() => {
    getCurrentWindow().show();
  }, []);

  return <AppShell />;
}
