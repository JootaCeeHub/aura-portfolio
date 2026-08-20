import React from 'react';
import type { McpModuleInfo } from '../services/mcpCoreClient';

interface Props {
  modules: McpModuleInfo[];
}

export const McpModuleTable: React.FC<Props> = ({ modules }) => {
  if (!modules || modules.length === 0) {
    return <p className="text-sm text-neutral-400 mt-2">No hay módulos MCP registrados aún.</p>;
  }

  return (
    <table className="w-full text-sm mt-3 border-collapse">
      <thead>
        <tr className="text-left text-neutral-400 border-b border-neutral-700">
          <th className="py-1">Nombre</th>
          <th className="py-1">URL</th>
          <th className="py-1">Scopes</th>
          <th className="py-1">Estado</th>
          <th className="py-1">Último Heartbeat</th>
        </tr>
      </thead>
      <tbody>
        {modules.map((m) => (
          <tr key={m.name} className="border-b border-neutral-800">
            <td className="py-1 text-neutral-100">{m.name}</td>
            <td className="py-1 text-neutral-300">{m.url}</td>
            <td className="py-1 text-neutral-300">
              {m.scopes && m.scopes.length > 0 ? m.scopes.join(', ') : '—'}
            </td>
            <td className="py-1 text-neutral-300">OK</td>
            <td className="py-1 text-neutral-300">—</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};
