import React, { useState } from 'react';

interface ConfigSliderProps {
  min: number;
  max: number;
  step?: number;
  value: number;
  onChange: (value: number) => void;
  labels?: { [key: number]: string };
  unit?: string;
  showInput?: boolean;
}

export function ConfigSlider({
  min,
  max,
  step = 1,
  value,
  onChange,
  labels,
  unit = '',
  showInput = true,
}: ConfigSliderProps) {
  const [inputValue, setInputValue] = useState(String(value));

  const handleInputChange = (newValue: string) => {
    setInputValue(newValue);
    const num = Number(newValue);
    if (!isNaN(num) && num >= min && num <= max) {
      onChange(num);
    }
  };

  const handleSliderChange = (newValue: number) => {
    onChange(newValue);
    setInputValue(String(newValue));
  };

  const percentage = ((value - min) / (max - min)) * 100;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => handleSliderChange(Number(e.target.value))}
          className="flex-1 h-2 rounded-lg bg-base-800 accent-accent-500 appearance-none cursor-pointer"
          style={{
            background: `linear-gradient(to right, rgb(0 229 255 / 0.3) 0%, rgb(0 229 255 / 0.3) ${percentage}%, rgb(30 30 46 / 0.5) ${percentage}%, rgb(30 30 46 / 0.5) 100%)`,
          }}
        />
        {showInput && (
          <input
            type="number"
            value={inputValue}
            onChange={(e) => handleInputChange(e.target.value)}
            className="input w-20 text-right text-xs"
            min={min}
            max={max}
            step={step}
          />
        )}
        <div className="min-w-24 text-right">
          <span className="text-sm font-bold text-accent-400">
            {labels ? labels[value] || value : `${value}${unit}`}
          </span>
        </div>
      </div>
      {labels && (
        <div className="flex justify-between text-xs text-neutral-500 px-1">
          {Object.entries(labels).map(([k]) => (
            <span key={k}>{labels[Number(k)]}</span>
          ))}
        </div>
      )}
    </div>
  );
}
