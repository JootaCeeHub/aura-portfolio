import React, { useEffect, useRef, useState } from 'react';

interface Props {
  url: string;
  token?: string;
}

export function HeartbeatPanel({ url, token }: Props) {
  const [pings, setPings] = useState<number[]>([]);
  const [status, setStatus] = useState<string>('offline');
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    try {
      if (esRef.current) esRef.current.close();
      const srcUrl = url;
      const es = new EventSource(srcUrl, { withCredentials: false } as any);
      esRef.current = es;
      setStatus('connected');
      es.addEventListener('ping', () => {
        setPings((prev) => [...prev.slice(-20), Date.now()]);
      });
      es.onerror = () => setStatus('degraded');
    } catch {
      setStatus('offline');
    }
    return () => {
      if (esRef.current) esRef.current.close();
    };
  }, [url, token]);

  return (
    <div className="card p-4">
      <div className="title-sm mb-2">Heartbeats</div>
      <div className="flex items-center gap-2 text-sm text-neutral-300 mb-2">
        <span>Estado:</span>
        <span
          className={
            status === 'connected'
              ? 'text-green-400'
              : status === 'degraded'
                ? 'text-yellow-400'
                : 'text-red-400'
          }
        >
          {status}
        </span>
      </div>
      <div className="flex gap-1">
        {pings.map((ts, i) => (
          <div key={i} className="h-2 w-2 bg-green-500 rounded-sm" />
        ))}
      </div>
    </div>
  );
}
