interface ConfirmDialogProps {
  title: string;
  message: string;
  imageUrl?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({ title, message, imageUrl, onConfirm, onCancel }: ConfirmDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-card border border-border rounded-xl p-5 mx-4 max-w-sm w-full space-y-4">
        {imageUrl && (
          <img
            src={imageUrl}
            alt=""
            className="w-full max-h-[200px] object-contain rounded-lg bg-muted"
          />
        )}
        <h3 className="text-base font-semibold">{title}</h3>
        <p className="text-sm text-muted-foreground">{message}</p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 min-h-[48px] rounded-lg bg-secondary text-secondary-foreground
              border border-border text-sm font-medium active:scale-95 transition-transform"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 min-h-[48px] rounded-lg bg-primary text-primary-foreground
              text-sm font-medium active:scale-95 transition-transform"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
