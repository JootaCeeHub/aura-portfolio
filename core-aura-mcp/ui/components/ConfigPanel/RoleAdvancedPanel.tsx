import React from 'react';
import type { AgentRoleDetail } from '../../services/agentRolesService';

interface Props {
  open: boolean;
  role: AgentRoleDetail;
  onClose: () => void;
  onApply?: (roleId: string) => void;
}

export function RoleAdvancedPanel({ open, role, onClose, onApply }: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-[90%] max-w-3xl bg-base-950 border border-white/10 rounded-lg shadow-xl p-6 z-10 overflow-auto">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="text-4xl">{role.icon}</div>
            <div>
              <h3 className="text-lg font-bold text-neutral-100">{role.label}</h3>
              <div className="text-xs text-neutral-400">{role.focus}</div>
            </div>
          </div>
          <button className="text-sm text-neutral-400" onClick={onClose}>Cerrar ✕</button>
        </div>

        <div className="space-y-4 text-sm text-neutral-300">
          <p>{role.description}</p>

          <div>
            <h4 className="text-xs font-semibold text-accent-400 mb-2">Capacidades</h4>
            <ul className="space-y-1">
              {role.capabilities?.map((c, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-accent-400">✓</span><span>{c}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-accent-400 mb-2">Casos de Uso</h4>
            <ul className="space-y-1">
              {role.use_cases?.map((u, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-primary-400">→</span><span>{u}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-red-400 mb-2">Limitaciones</h4>
            <ul className="space-y-1">
              {role.limitations?.map((l, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-red-400">⚠️</span><span>{l}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={() => { onApply?.(role.id); }}
            className="btn btn-primary"
          >
            Seleccionar como Rol Principal
          </button>
          <button onClick={onClose} className="btn btn-ghost">Cerrar</button>
        </div>
      </div>
    </div>
  );
}
