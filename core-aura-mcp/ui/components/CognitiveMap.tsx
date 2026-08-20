import React from 'react';

interface Node {
  id: string;
  label: string;
  status: 'OK' | 'WARN' | 'DOWN' | 'DEGRADED';
}

interface Edge {
  from: string;
  to: string;
}

interface Props {
  nodes: Node[];
  edges: Edge[];
}

export function CognitiveMap({ nodes, edges }: Props) {
  return (
    <div className="glass-panel rounded-xl p-6 relative overflow-hidden min-h-[300px]">
      <div className="title-sm mb-4 flex items-center gap-2">
        <span className="text-xl">🧠</span>
        MAPA COGNITIVO
      </div>

      {/* Grid Background */}
      <div
        className="absolute inset-0 opacity-10 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(#444 1px, transparent 1px)',
          backgroundSize: '20px 20px',
        }}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
        <div>
          <div className="text-xs font-bold text-accent-400 uppercase tracking-widest mb-3 border-b border-white/10 pb-1">
            Nodos Activos
          </div>
          <div className="space-y-2">
            {nodes.map((n) => (
              <div
                key={n.id}
                className="flex items-center gap-3 p-2 rounded-lg bg-base-900/40 border border-white/5 hover:border-accent-500/30 transition-all group"
              >
                <div
                  className={`w-2 h-2 rounded-full shadow-[0_0_8px_currentColor] ${
                    n.status === 'OK'
                      ? 'bg-success text-success'
                      : n.status === 'DOWN'
                        ? 'bg-error text-error'
                        : n.status === 'DEGRADED'
                          ? 'bg-primary-500 text-primary-500'
                          : 'bg-warning text-warning'
                  }`}
                />
                <span className="text-neutral-200 font-mono text-sm group-hover:text-accent-400 transition-colors">
                  {n.label}
                </span>
                <span className="ml-auto text-[10px] bg-base-900 px-2 py-0.5 rounded text-neutral-500 border border-white/5">
                  {n.status}
                </span>
              </div>
            ))}
            {nodes.length === 0 && (
              <div className="text-sm text-neutral-500 italic py-2">
                Esperando conexión de nodos...
              </div>
            )}
          </div>
        </div>

        <div>
          <div className="text-xs font-bold text-accent-400 uppercase tracking-widest mb-3 border-b border-white/10 pb-1">
            Topología
          </div>
          <div className="space-y-2">
            {edges.map((e, i) => (
              <div
                key={i}
                className="flex items-center gap-2 text-sm text-neutral-400 font-mono p-2"
              >
                <span className="text-neutral-200">{e.from}</span>
                <span className="text-accent-500">──▶</span>
                <span className="text-neutral-200">{e.to}</span>
              </div>
            ))}
            {edges.length === 0 && (
              <div className="text-sm text-neutral-500 italic py-2">Sin relaciones activas</div>
            )}
          </div>
        </div>
      </div>

      {/* Central Pulse Animation if empty */}
      {nodes.length === 0 && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
          <div className="w-32 h-32 bg-accent-500/5 rounded-full animate-pulse-slow blur-xl" />
        </div>
      )}
    </div>
  );
}
