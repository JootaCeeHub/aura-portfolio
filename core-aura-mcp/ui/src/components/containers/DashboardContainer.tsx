import React, { useEffect, useState, useMemo } from 'react';
import { McpCoreClient, CoreStatus } from '../../services/mcpCoreClient';
import DashboardPanel from '../ui/DashboardPanel';

type Props = {
  client?: McpCoreClient;
  coreUrl?: string;
};

export default function DashboardContainer({ client, coreUrl }: Props) {
  // ...existing state initialization...
  const [status, setStatus] = useState<CoreStatus | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const { clientInstance, owns } = useMemo(() => {
    if (client) return { clientInstance: client, owns: false };
    try {
      const inst = (McpCoreClient as any).getInstance
        ? (McpCoreClient as any).getInstance(coreUrl)
        : null;
      if (inst) return { clientInstance: inst as McpCoreClient, owns: false };
    } catch {
      // ignore
    }
    const created = new McpCoreClient(
      coreUrl ??
      (typeof window !== 'undefined' ? (window as any).__CORE_URL__ : 'http://localhost:3000')
    );
    return { clientInstance: created, owns: true };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, coreUrl]);

  useEffect(() => {
    let unsubStatus: (() => void) | null = null;
    let unsubReconnectAttempt: (() => void) | null = null;
    let unsubReconnected: (() => void) | null = null;
    let mounted = true;

    const init = async () => {
      setLoading(true);
      setConnectionError(null);

      try {
        await clientInstance.connect();
      } catch (err: any) {
        if (mounted) setConnectionError(err?.message ?? String(err));
      }

      try {
        const s = await clientInstance.getStatus();
        if (mounted) setStatus(s);
      } catch {
        // ignore
      } finally {
        if (mounted) setLoading(false);
      }

      // suscribirse a status
      unsubStatus = clientInstance.subscribe('status', (s: CoreStatus) => {
        if (!mounted) return;
        setStatus(s);
        setConnectionError(null);
        setLoading(false);
      });

      // mostrar toast en intentos de reconexión
      unsubReconnectAttempt = clientInstance.subscribe('ws.reconnect_attempt', (meta: any) => {
        if (!mounted) return;
        console.log(`Reconectando... intento ${meta?.attempt ?? '?'}`, 'mcp-reconnect');
      });

      // notificar al reconectar
      unsubReconnected = clientInstance.subscribe('ws.reconnected', () => {
        if (!mounted) return;
        console.log('Reconectado al Core');
      });
    };

    init();

    return () => {
      mounted = false;
      if (unsubStatus) unsubStatus();
      if (unsubReconnectAttempt) unsubReconnectAttempt();
      if (unsubReconnected) unsubReconnected();
      // Si este contenedor creó el cliente, desconectarlo para liberar recursos
      if (owns) {
        try {
          clientInstance.disconnect();
        } catch {
          // ignore
        }
      }
    };
  }, [clientInstance, owns]);

  return <DashboardPanel status={status} loading={loading} connectionError={connectionError} />;
}
