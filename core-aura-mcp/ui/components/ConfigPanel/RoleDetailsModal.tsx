import React, { useState, useEffect } from 'react';
import type { AgentRoleDetail } from '../../services/agentRolesService';

interface Props {
  open: boolean;
  onClose: () => void;
  roles: AgentRoleDetail[];
  initialRoleId?: string | null;
  onSelectRole?: (id: string) => void;
}

export function RoleDetailsModal({ open, onClose, roles, initialRoleId, onSelectRole }: Props) {
  const [currentId, setCurrentId] = useState<string | null>(initialRoleId ?? (roles[0]?.id ?? null));

  useEffect(() => {
    if (open) {
      setCurrentId(initialRoleId ?? (roles[0]?.id ?? null));
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [open, initialRoleId, roles]);

  if (!open) return null;

  const current = roles.find((r) => r.id === currentId) ?? roles[0];

  return (
    <div className="fixed inset-0 z-50 flex items-stretch">
      {/* backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      {/* panel */}
      <div className="relative mx-auto my-12 w-[90%] max-w-6xl h-[80%] bg-base-950 border border-white/10 rounded-lg shadow-xl overflow-hidden flex">
        {/* left: lista */}
        <div className="w-80 bg-base-900/50 border-r border-white/5 overflow-auto p-4 space-y-3">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-bold text-accent-400">Roles</h4>
            <button className="text-xs text-neutral-400" onClick={onClose}>Cerrar ✕</button>
          </div>
          {roles.map((r) => (
            <button
              key={r.id}
              onClick={() => { setCurrentId(r.id); onSelectRole?.(r.id); }}
              className={`w-full text-left p-3 rounded-lg transition-colors ${
                r.id === current?.id ? 'bg-accent-500/10 border border-accent-500/20' : 'hover:bg-base-900/60'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{r.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm text-neutral-100">{r.label}</div>
                  <div className="text-xs text-neutral-400 line-clamp-2">{r.description}</div>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* right: detalle */}
        <div className="flex-1 p-6 overflow-auto space-y-4">
          <div className="flex items-start gap-4">
            <div className="text-5xl">{current?.icon}</div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-neutral-100">{current?.label}</h2>
              <p className="text-sm text-neutral-400">{current?.focus}</p>
            </div>
            <div className="text-sm text-neutral-400">
              <div className="mb-1">Autonomía</div>
              <div className="font-bold text-blue-300">{current?.autonomy_level}</div>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-bold text-accent-400 mb-2">Descripción</h4>
            <p className="text-sm text-neutral-300">{current?.description}</p>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <h4 className="text-sm font-bold text-accent-400 mb-2">Capacidades</h4>
              <ul className="space-y-1">
                {current?.capabilities.map((c, i) => (
                  <li key={i} className="text-sm text-neutral-300 flex items-start gap-2">
                    <span className="text-accent-400">✓</span><span>{c}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-bold text-accent-400 mb-2">Casos de Uso</h4>
              <ul className="space-y-1">
                {current?.use_cases.map((u, i) => (
                  <li key={i} className="text-sm text-neutral-300 flex items-start gap-2">
                    <span className="text-primary-400">→</span><span>{u}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-bold text-red-400 mb-2">Limitaciones</h4>
            <ul className="space-y-1">
              {current?.limitations.map((l, i) => (
                <li key={i} className="text-sm text-neutral-300 flex items-start gap-2">
                  <span className="text-red-400">⚠️</span><span>{l}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex gap-3 mt-4">
            <button
              onClick={() => { onSelectRole?.(current!.id); onClose(); }}
              className="btn btn-primary"
            >
              Seleccionar como Rol Principal
            </button>
            <button onClick={onClose} className="btn btn-ghost">Cerrar</button>
          </div>
        </div>
      </div>
    </div>
  );
}
