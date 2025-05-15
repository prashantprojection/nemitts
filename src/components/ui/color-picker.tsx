import { useState, useEffect } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";

interface ColorPickerProps {
  color: string;
  onChange: (color: string) => void;
  allowAlpha?: boolean;
}

export const ColorPicker = ({ color, onChange, allowAlpha = false }: ColorPickerProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentColor, setCurrentColor] = useState(color);
  const [alpha, setAlpha] = useState(100);

  useEffect(() => {
    // Parse the initial color to extract alpha if it's an rgba value
    if (color.startsWith('rgba')) {
      const match = color.match(/rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([\d.]+)\s*\)/);
      if (match) {
        const a = parseFloat(match[4]);
        setAlpha(Math.round(a * 100));
      }
    }
    setCurrentColor(color);
  }, [color]);

  const handleColorChange = (newColor: string) => {
    setCurrentColor(newColor);
    
    if (allowAlpha) {
      // If the color is a hex value, convert it to rgba
      if (newColor.startsWith('#')) {
        const r = parseInt(newColor.slice(1, 3), 16);
        const g = parseInt(newColor.slice(3, 5), 16);
        const b = parseInt(newColor.slice(5, 7), 16);
        const a = alpha / 100;
        onChange(`rgba(${r}, ${g}, ${b}, ${a})`);
      } else {
        onChange(newColor);
      }
    } else {
      onChange(newColor);
    }
  };

  const handleAlphaChange = (value: number[]) => {
    const newAlpha = value[0];
    setAlpha(newAlpha);
    
    // Update the color with the new alpha
    if (currentColor.startsWith('#')) {
      const r = parseInt(currentColor.slice(1, 3), 16);
      const g = parseInt(currentColor.slice(3, 5), 16);
      const b = parseInt(currentColor.slice(5, 7), 16);
      onChange(`rgba(${r}, ${g}, ${b}, ${newAlpha / 100})`);
    } else if (currentColor.startsWith('rgb')) {
      // Extract RGB values and update alpha
      const match = currentColor.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*[\d.]+\s*)?\)/);
      if (match) {
        const r = parseInt(match[1]);
        const g = parseInt(match[2]);
        const b = parseInt(match[3]);
        onChange(`rgba(${r}, ${g}, ${b}, ${newAlpha / 100})`);
      }
    }
  };

  // Convert rgba to hex for the color input
  const rgbaToHex = (rgba: string): string => {
    const match = rgba.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*[\d.]+\s*)?\)/);
    if (match) {
      const r = parseInt(match[1]);
      const g = parseInt(match[2]);
      const b = parseInt(match[3]);
      return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    }
    return rgba;
  };

  // Get the display color (without alpha for the preview)
  const getDisplayColor = (): string => {
    if (currentColor.startsWith('rgba')) {
      return rgbaToHex(currentColor);
    }
    return currentColor;
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          className="w-full h-10 rounded-md border border-input flex items-center justify-between px-3"
          style={{ backgroundColor: currentColor }}
        >
          <span className="sr-only">Pick a color</span>
          <span 
            className="w-full text-left truncate" 
            style={{ 
              color: currentColor.startsWith('#') && parseInt(currentColor.slice(1), 16) > 0x888888 ? 'black' : 'white'
            }}
          >
            {currentColor}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64">
        <div className="space-y-4">
          <div>
            <Input
              type="color"
              value={getDisplayColor()}
              onChange={(e) => handleColorChange(e.target.value)}
              className="w-full h-32 p-1 cursor-pointer"
            />
          </div>
          
          {allowAlpha && (
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label htmlFor="alpha">Opacity</Label>
                <span className="text-sm">{alpha}%</span>
              </div>
              <Slider
                id="alpha"
                min={0}
                max={100}
                step={1}
                value={[alpha]}
                onValueChange={handleAlphaChange}
              />
            </div>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="color-value">Color Value</Label>
            <Input
              id="color-value"
              value={currentColor}
              onChange={(e) => handleColorChange(e.target.value)}
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};
