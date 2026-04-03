import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Delete } from "lucide-react";

interface NumericKeypadProps {
  title: string;
  initialValue: number;
  unit: string;
  min: number;
  max: number;
  allowDecimal?: boolean;
  onSubmit: (value: number) => void;
  onCancel: () => void;
}

export function NumericKeypad({
  title,
  initialValue,
  unit,
  min,
  max,
  allowDecimal,
  onSubmit,
  onCancel,
}: NumericKeypadProps) {
  const [display, setDisplay] = useState(initialValue > 0 ? String(initialValue) : "");

  const append = (char: string) => {
    setDisplay((d) => {
      if (char === "." && d.includes(".")) return d;
      const next = d + char;
      if (next === ".") return "0.";
      const num = Number(next);
      if (isNaN(num) || num > max) return d;
      return next;
    });
  };

  const backspace = () => setDisplay((d) => d.slice(0, -1));
  const clear = () => setDisplay("");

  const submit = () => {
    const num = Number(display) || 0;
    onSubmit(Math.max(min, Math.min(max, num)));
  };

  const keys = allowDecimal
    ? ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "DEL"]
    : ["1", "2", "3", "4", "5", "6", "7", "8", "9", "C", "0", "DEL"];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50">
      <div className="bg-card border-t border-border rounded-t-2xl w-full max-w-md p-4 space-y-3 shadow-2xl">
        <div className="text-sm text-muted-foreground font-medium">{title}</div>
        <div className="text-2xl landscape:text-3xl font-bold tabular-nums text-right px-2">
          {display || "0"}<span className="text-base landscape:text-lg text-muted-foreground ml-1">{unit}</span>
        </div>
        <div className="grid grid-cols-3 gap-1.5 landscape:gap-2.5">
          {keys.map((key) => (
            <Button
              key={key}
              variant="secondary"
              className="h-12 landscape:h-14 text-base landscape:text-lg"
              onClick={() => {
                if (key === "C") clear();
                else if (key === "DEL") {
                  if (display.length <= 1) clear();
                  else backspace();
                }
                else append(key);
              }}
            >
              {key === "DEL" ? <Delete size={20} /> : key}
            </Button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-1.5 landscape:gap-2.5">
          <Button variant="ghost" className="h-11 landscape:h-12" onClick={onCancel}>
            Cancel
          </Button>
          <Button className="h-11 landscape:h-12 font-semibold" onClick={submit}>
            Set
          </Button>
        </div>
      </div>
    </div>
  );
}
