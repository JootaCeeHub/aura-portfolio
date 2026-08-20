/* eslint-disable */
import React, { useEffect, useState, useMemo } from 'react';
import { McpCoreClient, LogEntry } from '../../src/services/mcpCoreClient';
import LogsPanel from '../../src/components/ui/LogsPanel';

type Props = {
  client?: McpCoreClient;
  coreUrl?: string;
  maxEntries?: number;
};

export default function LogsContainer({ client, coreUrl, maxEntries = 200 }: Props) {
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const { clientInstance, owns } = useMemo(() => {
    if (client) return { clientInstance: client, owns: false };
    try {
      const inst = McpCoreClient.getInstance(coreUrl);
      if (inst) return { clientInstance: inst as McpCoreClient, owns: false };
    } catch {
      // fallthrough
    }
    const created = new McpCoreClient(
      coreUrl ??
      (typeof window !== 'undefined' ? (window as any).__CORE_URL__ : 'http://localhost:3000')
    );
    return { clientInstance: created, owns: true };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, coreUrl]);

  useEffect(() => {
    let mounted = true;

    const pushLog = (entry: LogEntry) => {
      setLogs((prev) => {
        const next = [...prev, entry].slice(-maxEntries);
        return next;
      });
    };

    // Cargar logs iniciales via API (si está disponible)
    (async () => {
      try {
        // intentar obtener logs iniciales; si falla, seguir con suscripción/polling
        const initial = await clientInstance.getLogs();
        if (!mounted) return;
        if (Array.isArray(initial) && initial.length) {
          setLogs((prev) => {
            const merged = [...prev, ...initial].slice(-maxEntries);
            return merged;
          });
        }
      } catch (err: any) {
        // mostrar error pero dejar que polling/WS provea logs después
      } finally {
        // cleanup
      }
    })();

    // subscripción a logs en tiempo real
    const unsub = clientInstance.subscribe('logs', (l: LogEntry) => {
      if (!mounted) return;
      pushLog(l);
    });

    return () => {
      mounted = false;
      unsub();
      if (owns) {
        try {
          clientInstance.disconnect();
        } catch {
          // ignore
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientInstance, maxEntries, owns]);

  // Pasar loading/connectionError al panel para UX
  return <LogsPanel logs={logs} />;
}
