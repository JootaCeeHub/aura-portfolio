/* eslint-disable */
import React, { useEffect, useState, useMemo } from 'react';
import { McpCoreClient, CoreStatus } from '../../src/services/mcpCoreClient';
import DashboardPanel from '../DashboardPanel';

type Props = {
  client?: McpCoreClient;
  coreUrl?: string; // opcional para inicializar singleton
};

export default function DashboardContainer({ client, coreUrl }: Props) {
  const [status, setStatus] = useState<CoreStatus | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const { clientInstance, owns } = useMemo(() => {
    if (client) return { clientInstance: client, owns: false };
    // intentar obtener singleton; si falla, crear uno local y tomar ownership
    try {
      const inst = (McpCoreClient as any).getInstance
        ? (McpCoreClient as any).getInstance(coreUrl)
        : null;
      if (inst) return { clientInstance: inst as McpCoreClient, owns: false };
    } catch {
      // fallthrough: crear local
    }
    // crear cliente local (se desconectará al desmontar)
    const created = new McpCoreClient(
      coreUrl ??
      (typeof window !== 'undefined' ? (window as any).__CORE_URL__ : 'http://localhost:3000')
    );
    return { clientInstance: created, owns: true };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, coreUrl]);

  useEffect(() => {
    let unsub: (() => void) | null = null;
    let mounted = true;

    const init = async () => {
      setLoading(true);
      setConnectionError(null);

      // intentar conectar (WS). Si falla, connect() puede iniciar polling y lanzar.
      try {
        await clientInstance.connect();
      } catch (err: any) {
        // mostrar error pero continuar: polling fallback puede estar activo
        if (mounted) setConnectionError(err?.message ?? String(err));
      }

      // intentar obtener status inicial por HTTP (no crítico)
      try {
        const s = await clientInstance.getStatus();
        if (mounted) setStatus(s);
      } catch {
        // ignore: rely on real-time updates / polling
      } finally {
        if (mounted) setLoading(false);
      }

      // suscribir a actualizaciones en tiempo real
      unsub = clientInstance.subscribe('status', (s: CoreStatus) => {
        if (!mounted) return;
        setStatus(s);
        // si llegó un status válido, limpiar error y loading
        setConnectionError(null);
        setLoading(false);
      });
    };

    init();

    return () => {
      mounted = false;
      if (unsub) unsub();
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
