
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";

interface VoiceSliderProps {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  formatValue?: (value: number) => string;
  onChange: (value: number[]) => void;
}

const VoiceSlider = ({
  id,
  label,
  value,
  min,
  max,
  step,
  formatValue = (val) => val !== undefined && val !== null ? val.toFixed(1) : '0.0',
  onChange
}: VoiceSliderProps) => {
  // Ensure value is a valid number
  const safeValue = value !== undefined && value !== null && !isNaN(value) ? value : min;
  return (
    <div className="space-y-4 my-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center">
        <Label htmlFor={id} className="text-sm font-medium">{label}: {formatValue(safeValue)}</Label>
      </div>
      <Slider
        id={id}
        value={[safeValue]}
        min={min}
        max={max}
        step={step}
        onValueChange={onChange}
        className="my-2"
      />
    </div>
  );
};

export default VoiceSlider;
