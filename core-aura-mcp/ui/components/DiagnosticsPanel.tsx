import React from 'react';

interface Props {
  status: any;
}

export function DiagnosticsPanel({ status }: Props) {
  const items = Object.entries(status || {})
    .filter(([k]) => !['servers'].includes(k))
    .slice(0, 20);

  return (
    <div className="card p-4">
      <div className="title-sm mb-2">Diagnóstico del Core</div>
      {status ? (
        <div className="space-y-1 text-sm">
          {items.map(([k, v]) => (
            <div key={k} className="flex items-start gap-3">
              <span className="text-neutral-400 w-40">{k}</span>
              <span className="text-neutral-300 flex-1">
                {typeof v === 'object' ? JSON.stringify(v) : String(v)}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-sm text-neutral-400">Sin datos de estado.</div>
      )}
    </div>
  );
}
