import React, { useEffect, useState, useMemo, useRef } from 'react';
import { McpCoreClient, LogEntry } from '../../services/mcpCoreClient';
import LogsPanel from '../ui/LogsPanel';

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
      const inst = (McpCoreClient as any).getInstance
        ? (McpCoreClient as any).getInstance(coreUrl)
        : null;
      if (inst) return { clientInstance: inst as McpCoreClient, owns: false };
    } catch {
      // Ignore errors
    }
    const created = new McpCoreClient(
      coreUrl ??
      (typeof window !== 'undefined' ? (window as any).__CORE_URL__ : 'http://localhost:3000')
    );
    return { clientInstance: created, owns: true };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, coreUrl]);

  // buffer para batching
  const bufferRef = useRef<LogEntry[]>([]);
  const rafRef = useRef<number | null>(null);

  const flushBuffer = () => {
    const buf = bufferRef.current;
    if (buf.length === 0) return;
    setLogs((prev) => {
      const merged = [...prev, ...buf].slice(-maxEntries);
      return merged;
    });
    bufferRef.current = [];
    rafRef.current = null;
  };

  useEffect(() => {
    let mounted = true;

    const pushLogBuffered = (entry: LogEntry) => {
      bufferRef.current.push(entry);
      // schedule flush via rAF if not scheduled
      if (rafRef.current == null) {
        rafRef.current = (window as any).requestAnimationFrame
          ? (window as any).requestAnimationFrame(() => flushBuffer())
          : (window.setTimeout(() => flushBuffer(), 50) as unknown as number);
      }
    };

    (async () => {
      try {
        const initial = await clientInstance.getLogs();
        if (!mounted) return;
        if (Array.isArray(initial) && initial.length) {
          setLogs((prev) => [...prev, ...initial].slice(-maxEntries));
        }
      } catch {
        // error ignored
      } finally {
        // cleanup
      }
    })();

    const unsub = clientInstance.subscribe('logs', (l: LogEntry) => {
      if (!mounted) return;
      pushLogBuffered(l);
    });

    return () => {
      mounted = false;
      unsub();
      // flush remaining buffer
      if (rafRef.current != null) {
        try {
          (window as any).cancelAnimationFrame?.(rafRef.current);
        } catch {
          // Ignore
        }
        flushBuffer();
      }
      if (owns) {
        try {
          clientInstance.disconnect();
        } catch {
          // Ignore
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientInstance, maxEntries, owns]);

  return <LogsPanel logs={logs} />;
}
