import React from 'react';

export type Suggestion = {
  id: string;
  message: string;
  actionLabel?: string;
};

interface Props {
  suggestions: Suggestion[];
  onAction?: (id: string) => void;
}

export function SuggestBanner({ suggestions, onAction }: Props) {
  if (!suggestions.length) return null;
  return (
    <div className="card p-3">
      <div className="title-sm mb-2">Sugerencias</div>
      <div className="space-y-2">
        {suggestions.map((s) => (
          <div key={s.id} className="flex items-center justify-between text-sm">
            <span className="text-neutral-300">{s.message}</span>
            {s.actionLabel && (
              <button className="btn" onClick={() => onAction?.(s.id)}>
                {s.actionLabel}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
