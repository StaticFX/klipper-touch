import { Button } from "@/components/ui/button";

interface ConfirmDialogProps {
  title: string;
  message: string;
  imageUrl?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({ title, message, imageUrl, onConfirm, onCancel }: ConfirmDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-card border border-border rounded-2xl p-5 mx-4 max-w-sm w-full space-y-4 shadow-2xl">
        {imageUrl && (
          <img
            src={imageUrl}
            alt=""
            className="w-full max-h-[200px] object-contain rounded-xl bg-muted"
          />
        )}
        <h3 className="text-base font-semibold">{title}</h3>
        <p className="text-sm text-muted-foreground">{message}</p>
        <div className="flex gap-3">
          <Button variant="secondary" className="flex-1 h-12" onClick={onCancel}>
            Cancel
          </Button>
          <Button className="flex-1 h-12 font-semibold" onClick={onConfirm}>
            Confirm
          </Button>
        </div>
      </div>
    </div>
  );
}
