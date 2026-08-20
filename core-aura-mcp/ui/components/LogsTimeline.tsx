import React, { useMemo } from 'react';

export type LogItem = {
  id: string;
  ts: number;
  level: 'info' | 'warn' | 'error' | 'tool';
  message: string;
  meta?: any;
  correlationId?: string;
};

interface Props {
  logs: LogItem[];
  filter?: { levels?: LogItem['level'][] };
  onExport?: (items: LogItem[]) => void;
}

export function LogsTimeline({ logs, filter, onExport }: Props) {
  const rows = useMemo(() => {
    const lv = filter?.levels || [];
    return logs.filter((l) => (lv.length ? lv.includes(l.level) : true)).slice(-200);
  }, [logs, filter]);

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="title-sm">Logs</div>
        <button className="btn" onClick={() => onExport?.(rows)}>
          Exportar JSON
        </button>
      </div>
      <div className="space-y-2">
        {rows.map((l) => (
          <div key={l.id} className="flex items-start gap-3 text-sm">
            <span
              className={
                l.level === 'info'
                  ? 'text-blue-400'
                  : l.level === 'warn'
                    ? 'text-yellow-400'
                    : l.level === 'error'
                      ? 'text-red-400'
                      : 'text-purple-400'
              }
            >
              {l.level.toUpperCase()}
            </span>
            <span className="text-neutral-300 flex-1">{l.message}</span>
            {l.correlationId && <span className="text-neutral-500">{l.correlationId}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}
