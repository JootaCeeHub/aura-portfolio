import React, { useState } from 'react';
import { getAllRoles, getRoleById, type AgentRoleDetail } from '../../services/agentRolesService';
import { ConfigTooltip } from './ConfigTooltip';
import { RoleDetailsModal } from './RoleDetailsModal'; // << -- nuevo import

interface RoleSelectorProps {
  selectedRoleId: string;
  onRoleChange: (roleId: string) => void;
  error?: string;
}

export function RoleSelector({ selectedRoleId, onRoleChange, error }: RoleSelectorProps) {
  const [showDetailsList, setShowDetailsList] = useState(false);
  const [modalRoleId, setModalRoleId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const roles = getAllRoles();
  const selectedRole = getRoleById(selectedRoleId);

  const getComplexityColor = (complexity: string) => {
    switch (complexity) {
      case 'low':
        return 'text-green-400';
      case 'medium':
        return 'text-yellow-400';
      case 'high':
        return 'text-red-400';
      default:
        return 'text-neutral-400';
    }
  };

  const getComplexityLabel = (complexity: string) => {
    switch (complexity) {
      case 'low':
        return '▢ Baja';
      case 'medium':
        return '▥ Media';
      case 'high':
        return '▮ Alta';
      default:
        return complexity;
    }
  };

  const getAutonomyIcon = (autonomy: string) => {
    switch (autonomy) {
      case 'restricted':
        return '🔒';
      case 'moderate':
        return '⚠️';
      case 'full':
        return '🚀';
      default:
        return '❓';
    }
  };

  const getAutonomyLabel = (autonomy: string) => {
    switch (autonomy) {
      case 'restricted':
        return 'Restringida';
      case 'moderate':
        return 'Moderada';
      case 'full':
        return 'Completa';
      default:
        return autonomy;
    }
  };

  return (
    <div className="space-y-4">
      <ConfigTooltip
        label="Rol Principal del Agente"
        tooltip="Selecciona el rol que define la especialización y capacidades principales del agente. Cada rol tiene capacidades, limitaciones y nivel de autonomía diferentes."
        required
        error={error}
      >
        <div />
      </ConfigTooltip>

      {/* Toggle para ver lista completa en modal */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => { setModalRoleId(null); setModalOpen(true); }}
          className="text-sm text-accent-400 hover:text-accent-300 transition-colors flex items-center gap-2"
        >
          ▶ Ver detalles de todos los roles
        </button>

        <button
          onClick={() => setShowDetailsList((s) => !s)}
          className="text-xs text-neutral-500 hover:text-neutral-300"
        >
          {showDetailsList ? 'Compacto' : 'Vista rápida'}
        </button>
      </div>

      {/* Grilla de roles (compacta) */}
      <div className={`grid gap-3 ${showDetailsList ? 'grid-cols-1' : 'grid-cols-2 md:grid-cols-3'}`}>
        {roles.map((role) => (
          <div key={role.id}>
            <button
              onClick={() => {
                onRoleChange(role.id);
                // si queremos ver detalle directo, abrimos modal con ese role
                if (showDetailsList) {
                  setModalRoleId(role.id);
                  setModalOpen(true);
                }
              }}
              className={`w-full p-4 rounded-lg border transition-all text-left ${
                selectedRoleId === role.id
                  ? 'border-accent-500/60 bg-accent-500/10 shadow-[0_0_15px_rgba(0,229,255,0.2)]'
                  : 'border-white/10 bg-base-900/40 hover:border-white/20 hover:bg-base-900/60'
              }`}
            >
              {/* ...existing inner card content... */}
              <div className="flex items-start gap-3">
                <span className="text-3xl flex-shrink-0">{role.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-neutral-100 text-sm">{role.label}</div>
                  <p className="text-xs text-neutral-400 line-clamp-2">{role.description}</p>

                  <div className="flex gap-2 mt-2 flex-wrap">
                    <span className={`text-xs px-2 py-1 rounded-full ${getComplexityColor(role.complexity)} bg-base-800/50`}>
                      {getComplexityLabel(role.complexity)}
                    </span>
                    <span className="text-xs px-2 py-1 rounded-full text-blue-300 bg-base-800/50">
                      {getAutonomyIcon(role.autonomy_level)} {getAutonomyLabel(role.autonomy_level)}
                    </span>
                    {role.requires_approval && (
                      <span className="text-xs px-2 py-1 rounded-full text-orange-300 bg-base-800/50">
                        ✓ Requiere aprobación
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </button>
          </div>
        ))}
      </div>

      {/* Panel resumen del rol seleccionado (sin detalles) */}
      {selectedRole && !showDetailsList && (
        // ...existing compact panel code...
        <div className="p-4 rounded-lg bg-base-900/40 border border-accent-500/20 space-y-3">
          {/* ...existing summary content... */}
          <div className="flex items-center gap-3">
            <span className="text-4xl">{selectedRole.icon}</span>
            <div>
              <h4 className="text-lg font-bold text-neutral-100">{selectedRole.label}</h4>
              <p className="text-sm text-neutral-400">{selectedRole.focus}</p>
            </div>
          </div>
          <p className="text-sm text-neutral-300">{selectedRole.description}</p>
          {/* ...quick stats and ver detalles button... */}
          <button
            onClick={() => { setModalRoleId(selectedRole.id); setModalOpen(true); }}
            className="w-full text-sm text-accent-400 hover:text-accent-300 transition-colors py-2 border border-accent-500/20 rounded-lg"
          >
            Ver todos los detalles →
          </button>
        </div>
      )}

      {/* Modal overlay con lista + detalle */}
      <RoleDetailsModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setModalRoleId(null); }}
        roles={roles}
        initialRoleId={modalRoleId}
        onSelectRole={(id) => {
          onRoleChange(id);
          setModalRoleId(id);
        }}
      />
    </div>
  );
}
