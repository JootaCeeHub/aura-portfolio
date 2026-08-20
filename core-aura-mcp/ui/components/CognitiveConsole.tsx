import React, { useState, useRef } from 'react';
import { McpCoreClient } from '../services/mcpCoreClient';
import type { LogItem } from './LogsTimeline';

interface Props {
  onLog: (l: LogItem) => void;
}

export function CognitiveConsole({ onLog }: Props) {
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const send = async () => {
    if (!input.trim() || busy) return;
    setBusy(true);
    const corr = String(Date.now());
    try {
      onLog({
        id: corr,
        ts: Date.now(),
        level: 'tool',
        message: 'core.agent.invoke',
        correlationId: corr,
      });
      const res = await McpCoreClient.call('core.agent.invoke', {
        agent: 'orchestrator_core',
        input,
      });
      onLog({
        id: corr + '-res',
        ts: Date.now(),
        level: 'info',
        message: JSON.stringify(res),
        correlationId: corr,
      });
      setInput('');
    } catch (e: any) {
      onLog({
        id: corr + '-err',
        ts: Date.now(),
        level: 'error',
        message: e?.message || String(e),
        correlationId: corr,
      });
    } finally {
      setBusy(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') send();
  };

  return (
    <div className="glass-panel rounded-xl p-1 border border-white/10 shadow-2xl bg-black/40">
      <div className="bg-base-900/80 rounded-t-lg px-4 py-2 flex items-center justify-between border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/50" />
          <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/50" />
        </div>
        <div className="text-xs font-mono text-neutral-500 tracking-widest uppercase">
          Terminal Cognitiva
        </div>
      </div>

      <div className="p-4 bg-base-900/50 rounded-b-lg min-h-[120px] flex flex-col justify-end relative overflow-hidden">
        {/* Scanline effect */}
        <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-10 bg-[length:100%_2px,3px_100%] opacity-20" />

        <div className="flex items-center gap-3 relative z-20">
          <span className="text-accent-400 font-mono text-lg animate-pulse">❯</span>
          <input
            ref={inputRef}
            className="flex-1 bg-transparent border-none outline-none text-neutral-200 font-mono placeholder-neutral-700 focus:ring-0"
            placeholder="Ingresa un comando o intención..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={busy}
            autoFocus
          />
          {busy && (
            <div className="flex gap-1">
              <div
                className="w-1.5 h-1.5 bg-accent-500 rounded-full animate-bounce"
                style={{ animationDelay: '0ms' }}
              />
              <div
                className="w-1.5 h-1.5 bg-accent-500 rounded-full animate-bounce"
                style={{ animationDelay: '150ms' }}
              />
              <div
                className="w-1.5 h-1.5 bg-accent-500 rounded-full animate-bounce"
                style={{ animationDelay: '300ms' }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
