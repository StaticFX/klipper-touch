import { useGcode } from "@/hooks/use-gcode";
import { usePrinterStore } from "@/stores/printer-store";
import { Button } from "@/components/ui/button";
import { ChevronUp, ChevronDown } from "lucide-react";

export function ZControls({ stepSize }: { stepSize: number }) {
  const { send } = useGcode();
  const zPos = usePrinterStore((s) => s.toolhead.position[2]);

  const moveZ = (dir: number) => {
    send(`G91\nG1 Z${dir * stepSize} F${stepSize >= 10 ? 1000 : 300}\nG90`);
  };

  const babyStep = (dir: number) => {
    send(`SET_GCODE_OFFSET Z_ADJUST=${dir * 0.01} MOVE=1`);
  };

  return (
    <div className="flex flex-col gap-2 items-center">
      <Button variant="secondary" size="xl" className="w-full" onClick={() => moveZ(1)}>
        <ChevronUp size={24} />
      </Button>
      <div className="text-center">
        <div className="text-xs text-muted-foreground">Z</div>
        <div className="text-sm font-medium tabular-nums">
          {zPos.toFixed(2)}
        </div>
      </div>
      <Button variant="secondary" size="xl" className="w-full" onClick={() => moveZ(-1)}>
        <ChevronDown size={24} />
      </Button>
      <div className="w-full border-t border-border pt-2 mt-1">
        <div className="text-[10px] text-muted-foreground text-center mb-1">
          Baby Step
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" className="flex-1" onClick={() => babyStep(-1)}>
            -0.01
          </Button>
          <Button variant="ghost" size="sm" className="flex-1" onClick={() => babyStep(1)}>
            +0.01
          </Button>
        </div>
      </div>
    </div>
  );
}
