import { TemperatureCard } from "./TemperatureCard";
import { TemperatureGraph } from "./TemperatureGraph";
import { useTemperature } from "@/hooks/use-temperature";

export function Dashboard() {
  const { extruder, bed } = useTemperature();

  return (
    <div className="p-3 flex flex-col gap-3 h-full">
      <div className="grid grid-cols-2 gap-3 shrink-0">
        <TemperatureCard
          label="Hotend"
          current={extruder.temperature}
          target={extruder.target}
          power={extruder.power}
          heater="extruder"
        />
        <TemperatureCard
          label="Bed"
          current={bed.temperature}
          target={bed.target}
          power={bed.power}
          heater="heater_bed"
        />
      </div>
      <div className="flex-1 min-h-[120px]">
        <TemperatureGraph />
      </div>
    </div>
  );
}
