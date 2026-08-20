import React from 'react';
import type { LogEntry } from '../../services/mcpCoreClient';

type Props = {
  logs: LogEntry[];
};

export default function LogsPanel({ logs }: Props) {
  return (
    <div className="p-4 bg-white shadow rounded h-full">
      <h3 className="text-lg font-semibold mb-2">Logs</h3>
      <div style={{ maxHeight: '60vh', overflow: 'auto' }}>
        {logs.length === 0 ? (
          <div className="text-sm text-gray-500">No logs yet</div>
        ) : (
          <ul className="text-xs font-mono space-y-1">
            {logs.map((l, idx) => (
              <li key={idx} className="border-b py-1">
                <div>
                  <strong>{l.timestamp}</strong> {l.level ?? 'info'}
                </div>
                <div>{(l as any).message ?? JSON.stringify(l)}</div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
