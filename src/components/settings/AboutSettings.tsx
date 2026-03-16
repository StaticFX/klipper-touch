import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useUpdateChecker } from "@/hooks/use-update-checker";
import { REPO_URL } from "@/lib/update-checker";
import { InfoRow } from "./InfoRow";
import { UpdateModal } from "./UpdateModal";
import {
  ChevronRight, RefreshCw, ArrowUpCircle, Loader2, Download, ExternalLink,
} from "lucide-react";

export function AboutSettings() {
  const { update, checking, check } = useUpdateChecker();
  const [showUpdateModal, setShowUpdateModal] = useState(false);

  return (
    <div className="space-y-4">
      <div className="text-center py-4 space-y-1">
        <div className="text-sm font-semibold">Klipper Touch</div>
        <div className="text-xs text-muted-foreground">
          {update ? `v${update.currentVersion}` : "..."}
        </div>
      </div>

      {/* Update status */}
      <div className="rounded-xl border border-border bg-muted/30 p-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Updates</span>
          <Button variant="ghost" size="sm" className="h-8 text-xs gap-1.5" disabled={checking} onClick={check}>
            {checking ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
            Check
          </Button>
        </div>
        {update && (
          <>
            <InfoRow label="Installed" value={`v${update.currentVersion}`} />
            <InfoRow
              label="Latest"
              value={update.latestVersion ? `v${update.latestVersion}` : "Unknown"}
            />
            {update.updateAvailable && (
              <div className="space-y-2 mt-1">
                <div className="flex items-center gap-2 p-2 rounded-xl bg-primary/10 border border-primary/20">
                  <ArrowUpCircle size={16} className="text-primary shrink-0" />
                  <span className="text-xs text-primary font-medium flex-1">
                    Update available: v{update.latestVersion}
                  </span>
                </div>
                <Button
                  className="w-full gap-2"
                  size="sm"
                  onClick={() => setShowUpdateModal(true)}
                >
                  <Download size={14} />
                  Install Update
                </Button>
              </div>
            )}
            {update.latestVersion && !update.updateAvailable && (
              <div className="text-xs text-muted-foreground mt-1">
                You are running the latest version.
              </div>
            )}
          </>
        )}
      </div>

      {/* Links */}
      <div className="space-y-1.5">
        <a
          href={REPO_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-border active:bg-accent/50 transition-colors duration-150"
        >
          <ExternalLink size={14} className="text-muted-foreground" />
          <span className="text-sm flex-1">GitHub Repository</span>
          <ChevronRight size={14} className="text-muted-foreground" />
        </a>
        {update?.releaseUrl && (
          <a
            href={update.releaseUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-border active:bg-accent/50 transition-colors duration-150"
          >
            <ExternalLink size={14} className="text-muted-foreground" />
            <span className="text-sm flex-1">Latest Release</span>
            <ChevronRight size={14} className="text-muted-foreground" />
          </a>
        )}
      </div>

      {showUpdateModal && (
        <UpdateModal onClose={() => setShowUpdateModal(false)} />
      )}
    </div>
  );
}
