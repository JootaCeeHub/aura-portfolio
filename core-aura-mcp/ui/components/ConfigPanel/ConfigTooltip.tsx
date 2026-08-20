import React, { useState } from 'react';

interface ConfigTooltipProps {
  label: string;
  tooltip: string;
  children: React.ReactNode;
  required?: boolean;
  error?: string;
}

export function ConfigTooltip({
  label,
  tooltip,
  children,
  required = false,
  error,
}: ConfigTooltipProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <label className={`text-xs font-medium ${error ? 'text-red-400' : 'text-neutral-400'}`}>
          {label}
          {required && <span className="text-red-400 ml-1">*</span>}
        </label>
        <button
          type="button"
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
          onClick={() => setShowTooltip(!showTooltip)}
          className="relative w-4 h-4 rounded-full bg-accent-500/20 text-accent-400 text-xs flex items-center justify-center hover:bg-accent-500/40 transition-all"
        >
          ?
          {showTooltip && (
            <div className="absolute left-6 top-0 w-64 p-3 rounded-lg bg-base-900/95 border border-accent-500/30 text-xs text-neutral-300 shadow-lg z-50 pointer-events-none whitespace-normal">
              {tooltip}
            </div>
          )}
        </button>
      </div>
      {children}
      {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
    </div>
  );
}
