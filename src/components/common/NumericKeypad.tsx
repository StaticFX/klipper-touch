import { useState } from "react";
import { Delete } from "lucide-react";

interface NumericKeypadProps {
  title: string;
  initialValue: number;
  unit: string;
  min: number;
  max: number;
  onSubmit: (value: number) => void;
  onCancel: () => void;
}

export function NumericKeypad({
  title,
  initialValue,
  unit,
  min,
  max,
  onSubmit,
  onCancel,
}: NumericKeypadProps) {
  const [display, setDisplay] = useState(initialValue > 0 ? String(initialValue) : "");

  const append = (digit: string) => {
    setDisplay((d) => {
      const next = d + digit;
      const num = Number(next);
      if (num > max) return d;
      return next;
    });
  };

  const backspace = () => setDisplay((d) => d.slice(0, -1));
  const clear = () => setDisplay("");

  const submit = () => {
    const num = Number(display) || 0;
    onSubmit(Math.max(min, Math.min(max, num)));
  };

  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "C", "0", "DEL"];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60">
      <div className="bg-card border-t border-border rounded-t-xl w-full max-w-md p-4 space-y-3">
        <div className="text-sm text-muted-foreground">{title}</div>
        <div className="text-3xl font-bold tabular-nums text-right px-2">
          {display || "0"}<span className="text-lg text-muted-foreground ml-1">{unit}</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {keys.map((key) => (
            <button
              key={key}
              onClick={() => {
                if (key === "C") clear();
                else if (key === "DEL") backspace();
                else append(key);
              }}
              className="min-h-[56px] rounded-lg bg-secondary text-secondary-foreground
                border border-border text-lg font-medium active:scale-90 transition-transform
                flex items-center justify-center"
            >
              {key === "DEL" ? <Delete size={20} /> : key}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={onCancel}
            className="min-h-[48px] rounded-lg bg-muted text-muted-foreground text-sm font-medium
              active:scale-95 transition-transform"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            className="min-h-[48px] rounded-lg bg-primary text-primary-foreground text-sm font-medium
              active:scale-95 transition-transform"
          >
            Set
          </button>
        </div>
      </div>
    </div>
  );
}
