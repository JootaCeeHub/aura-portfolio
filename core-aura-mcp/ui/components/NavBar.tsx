import React from 'react';
import { StatusDot, Button } from './ui';

interface Props {
  connected: boolean;
  url: string;
  latencyMs?: number;
  env?: string;
}

export function NavBar({ connected, url, latencyMs, env }: Props) {
  return (
    <div className="sticky top-0 z-50 w-full border-b border-white/5 bg-base-950/80 backdrop-blur-xl supports-[backdrop-filter]:bg-base-950/60">
      <div className="max-w-full mx-auto px-6 py-3 flex items-center gap-6">
        {/* Logo Area */}
        <div className="flex items-center gap-3 group cursor-default">
          <div className="relative">
            <StatusDot
              color={connected ? 'success' : 'error'}
              className="h-3 w-3 shadow-[0_0_10px_rgba(0,0,0,0.2)]"
            />
            {connected && (
              <div className="absolute inset-0 rounded-full bg-success animate-ping opacity-75" />
            )}
          </div>
          <div className="flex flex-col">
            <span className="text-neutral-100 font-display font-bold tracking-wide text-sm group-hover:text-accent-400 transition-colors">
              AURA MCP
            </span>
            <span className="text-[10px] text-neutral-500 uppercase tracking-widest">
              Maestro Cognitivo
            </span>
          </div>
        </div>

        <div className="h-6 w-px bg-white/10" />

        {/* Environment Badge */}
        <Button
          variant="ghost"
          size="xs"
          className="px-2 py-1 rounded bg-white/5 border border-white/10 text-[10px] font-mono text-neutral-400 uppercase tracking-wider"
        >
          {env || 'DEV'}
        </Button>

        <div className="flex-1" />

        {/* Status Indicators */}
        <div className="flex items-center gap-6 text-xs font-medium text-neutral-500">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-base-900/50 border border-white/5">
            <StatusDot color="neutral" className="w-1.5 h-1.5 bg-accent-500" />
            <span className="font-mono text-neutral-300">{url}</span>
          </div>

          {typeof latencyMs === 'number' && (
            <div className="flex items-center gap-2">
              <span
                className={
                  latencyMs < 50 ? 'text-success' : latencyMs < 200 ? 'text-warning' : 'text-error'
                }
              >
                ⚡
              </span>
              <span className="font-mono">{latencyMs}ms</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
