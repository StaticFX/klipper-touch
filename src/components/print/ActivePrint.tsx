import { useState, useEffect, useRef } from "react";
import { usePrintStore } from "@/stores/print-store";
import { getFileMetadata, getThumbnailUrl } from "@/lib/moonraker/client";
import { Button } from "@/components/ui/button";
import { Info, Sliders } from "lucide-react";
import { PrintTab } from "./PrintTab";
import { DetailsTab } from "./DetailsTab";
import { AdjustTab } from "./AdjustTab";

export function ActivePrint() {
  const [tab, setTab] = useState<"print" | "details" | "adjust">("print");

  const stats = usePrintStore((s) => s.print_stats);
  const thumbnailUrl = usePrintStore((s) => s.thumbnailUrl);

  const lastFile = useRef("");
  useEffect(() => {
    const fn = stats.filename;
    if (!fn || fn === lastFile.current) return;
    lastFile.current = fn;
    getFileMetadata(fn)
      .then((meta) => {
        const best = meta.thumbnails?.sort((a, b) => b.width - a.width)[0];
        usePrintStore.getState().setThumbnailUrl(
          best ? getThumbnailUrl(fn, best.relative_path) : null
        );
      })
      .catch(() => usePrintStore.getState().setThumbnailUrl(null));
  }, [stats.filename]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 min-h-0 overflow-y-auto">
        {tab === "print" && <PrintTab filename={stats.filename} thumbnailUrl={thumbnailUrl} />}
        {tab === "details" && <DetailsTab />}
        {tab === "adjust" && <AdjustTab />}
      </div>

      {/* Bottom tabs */}
      <div className="flex gap-2 px-3 py-2 shrink-0 border-t border-border">
        <TabBtn active={tab === "print"} label="Print" onTap={() => setTab("print")} />
        <TabBtn active={tab === "details"} icon={<Info size={16} />} label="Details" onTap={() => setTab("details")} />
        <TabBtn active={tab === "adjust"} icon={<Sliders size={16} />} label="Adjust" onTap={() => setTab("adjust")} />
      </div>
    </div>
  );
}

function TabBtn({ active, icon, label, onTap }: {
  active: boolean; icon?: React.ReactNode; label: string; onTap: () => void;
}) {
  return (
    <Button variant={active ? "default" : "secondary"} className="flex-1 h-11" onClick={onTap}>
      {icon} {label}
    </Button>
  );
}
