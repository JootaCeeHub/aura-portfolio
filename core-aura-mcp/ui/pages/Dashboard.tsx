import React, { useEffect, useState } from 'react';
import { McpCoreClient, CoreStatus, McpModuleInfo } from '../services/mcpCoreClient';
import { McpServerStatusCard } from '../components/McpServerStatusCard';
import { McpModuleTable } from '../components/McpModuleTable';

export const Dashboard: React.FC = () => {
  const [status, setStatus] = useState<CoreStatus | null>(null);
  const [modules, setModules] = useState<McpModuleInfo[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const s = await McpCoreClient.getStatus();
        const mods = await McpCoreClient.listServers();
        setStatus(s);
        setModules(mods);
      } catch (err: any) {
        setError(err.message || 'Error cargando datos del Core AURA');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return <p className="text-sm text-zinc-400">Cargando panel AURA-MCP...</p>;
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-700 bg-red-950 p-4 text-red-100">
        <p className="font-semibold">Error en el panel AURA-MCP</p>
        <p className="text-sm mt-1">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <McpServerStatusCard status={status} />
      <div className="rounded-xl border p-4 bg-zinc-900 text-zinc-100">
        <h2 className="text-lg font-semibold mb-2">Módulos MCP registrados</h2>
        <McpModuleTable modules={modules} />
      </div>
    </div>
  );
};
