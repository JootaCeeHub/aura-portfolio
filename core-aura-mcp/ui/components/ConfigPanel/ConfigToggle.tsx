import React from 'react';

interface ConfigToggleProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  disabledReason?: string;
  disabled?: boolean;
  label?: string;
}

export function ConfigToggle({
  enabled,
  onChange,
  disabledReason,
  disabled = false,
  label,
}: ConfigToggleProps) {
  return (
    <div className="flex items-center gap-3">
      <button
        onClick={() => !disabled && onChange(!enabled)}
        disabled={disabled}
        title={disabledReason}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all ${
          disabled
            ? 'opacity-50 cursor-not-allowed'
            : enabled
            ? 'bg-accent-500/40 border border-accent-500/60'
            : 'bg-base-800 border border-white/10'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full transition-transform ${
            enabled ? 'translate-x-6 bg-accent-400' : 'translate-x-1 bg-neutral-400'
          }`}
        />
      </button>
      {label && <span className="text-sm text-neutral-300">{label}</span>}
    </div>
  );
}
