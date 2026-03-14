import { AppShell } from "@/components/layout/AppShell";
import { useMoonraker } from "@/hooks/use-moonraker";

export default function App() {
  useMoonraker();
  return <AppShell />;
}
