import { useGcode } from "@/hooks/use-gcode";
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from "lucide-react";

export function JogPad({ stepSize }: { stepSize: number }) {
  const { send } = useGcode();

  const move = (axis: string, dir: number) => {
    send(`G91\nG1 ${axis}${dir * stepSize} F${stepSize >= 10 ? 6000 : 1000}\nG90`);
  };

  const btn =
    "flex items-center justify-center min-w-[64px] min-h-[64px] rounded-lg bg-secondary text-secondary-foreground border border-border active:scale-90 transition-transform";

  return (
    <div className="grid grid-cols-3 gap-2 max-w-[220px] mx-auto">
      <div />
      <button className={btn} onClick={() => move("Y", 1)}>
        <ArrowUp size={24} />
      </button>
      <div />
      <button className={btn} onClick={() => move("X", -1)}>
        <ArrowLeft size={24} />
      </button>
      <div className="flex items-center justify-center text-xs text-muted-foreground">
        X/Y
      </div>
      <button className={btn} onClick={() => move("X", 1)}>
        <ArrowRight size={24} />
      </button>
      <div />
      <button className={btn} onClick={() => move("Y", -1)}>
        <ArrowDown size={24} />
      </button>
      <div />
    </div>
  );
}
