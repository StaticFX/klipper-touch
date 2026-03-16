import { useToastStore, type ToastType } from "@/stores/toast-store";
import { AlertCircle, AlertTriangle, Info, X } from "lucide-react";

const styles: Record<ToastType, { icon: typeof AlertCircle; cls: string }> = {
  error: {
    icon: AlertCircle,
    cls: "bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300",
  },
  warning: {
    icon: AlertTriangle,
    cls: "bg-orange-50 dark:bg-orange-950 border-orange-200 dark:border-orange-800 text-orange-700 dark:text-orange-300",
  },
  info: {
    icon: Info,
    cls: "bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300",
  },
};

export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismissToast);

  if (toasts.length === 0) return null;

  return (
    <div className="absolute top-12 left-3 right-3 z-50 space-y-2 pointer-events-none">
      {toasts.map((toast) => {
        const s = styles[toast.type];
        const Icon = s.icon;
        return (
          <div
            key={toast.id}
            className={`flex items-start gap-2 px-3 py-2.5 rounded-xl border shadow-lg pointer-events-auto ${s.cls}`}
            style={{ animation: "toast-slide-in 250ms ease-out" }}
          >
            <Icon size={16} className="shrink-0 mt-0.5" />
            <span className="text-xs font-medium flex-1 min-w-0 break-words">
              {toast.message}
            </span>
            <button
              className="shrink-0 opacity-60 active:opacity-100 p-0.5"
              onClick={() => dismiss(toast.id)}
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
