import React from 'react';
import type { CoreStatus } from '../services/mcpCoreClient';

interface Props {
  status: CoreStatus | null;
}

export const McpServerStatusCard: React.FC<Props> = ({ status }) => {
  if (!status) {
    return (
      <div className="rounded-xl border p-4 bg-zinc-900 text-zinc-100">
        <p className="text-sm text-zinc-400">Sin datos del Core AURA.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border p-4 bg-zinc-900 text-zinc-100">
      <h2 className="text-lg font-semibold mb-2">Estado AURA-MCP-Core</h2>
      <p className="text-sm text-zinc-300">
        <span className="font-medium">Estado:</span>{' '}
        {status.ok ? 'Operativo ✅' : 'Con problemas ⚠️'}
      </p>
      <p className="text-xs text-zinc-500 mt-1">Última actualización: {status.timestamp}</p>
      <p className="text-sm text-zinc-300 mt-2">
        Módulos registrados: <span className="font-semibold">{status.modules.length}</span>
      </p>
    </div>
  );
};
