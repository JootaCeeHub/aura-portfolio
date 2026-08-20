import React from 'react';
import { PanelHeader, Badge, StatusDot } from './ui';

interface DashboardPanelProps {
  status?: any;
  modules?: any[];
  loading?: boolean;
  connectionError?: string | null;
}

export default function DashboardPanel({ status, modules }: DashboardPanelProps) {
  const systemMetrics = {
    uptime: status?.uptime ? `${Math.floor(status.uptime / 3600)}h` : '5h 23m',
    requests: 1247,
    avgLatency: '45ms',
    activeAgents: modules?.length || 22,
    activeTools: 12,
    integrations: 8,
  };

  const recentActivity = [
    { time: '08:01', action: 'Agent orchestrator_core invoked', status: 'success' },
    { time: '08:00', action: 'Database query executed', status: 'success' },
    { time: '07:58', action: 'n8n workflow triggered', status: 'success' },
    { time: '07:55', action: 'OpenAI API call completed', status: 'success' },
  ];

  const quickActions = [
    {
      id: 'invoke-agent',
      icon: '🤖',
      title: 'Invocar Agente',
      description: 'Ejecutar un agente especializado',
    },
    {
      id: 'run-workflow',
      icon: '⚡',
      title: 'Ejecutar Workflow',
      description: 'Activar automatización n8n',
    },
    { id: 'query-db', icon: '💾', title: 'Consultar DB', description: 'Ejecutar query SQL' },
    {
      id: 'test-integration',
      icon: '🔌',
      title: 'Test Integración',
      description: 'Probar conexiones',
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      {/* Hero Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="glass-panel p-6 rounded-2xl hover:bg-base-900/60 hover:border-accent-500/30 transition-all duration-300 group cursor-pointer relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-accent-500/10 rounded-full blur-2xl -mr-10 -mt-10 group-hover:bg-accent-500/20 transition-colors" />
          <div className="flex items-center justify-between mb-4 relative z-10">
            <div className="p-3 rounded-xl bg-accent-500/10 text-accent-400 group-hover:scale-110 transition-transform duration-300 border border-accent-500/20">
              <span className="text-3xl">🧠</span>
            </div>
            <div className="text-right">
              <div className="text-4xl font-display font-bold text-white mb-1">
                {systemMetrics.activeAgents}
              </div>
              <div className="text-[10px] text-neutral-400 uppercase tracking-widest font-bold">
                Agentes Activos
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 relative z-10">
            <div className="w-2 h-2 rounded-full bg-success shadow-[0_0_8px_#10b981] animate-pulse" />
            <span className="text-xs text-neutral-400 font-medium">Todos operativos</span>
          </div>
        </div>

        <div className="glass-panel p-6 rounded-2xl hover:bg-base-900/60 hover:border-primary-500/30 transition-all duration-300 group cursor-pointer relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-primary-500/10 rounded-full blur-2xl -mr-10 -mt-10 group-hover:bg-primary-500/20 transition-colors" />
          <div className="flex items-center justify-between mb-4 relative z-10">
            <div className="p-3 rounded-xl bg-primary-500/10 text-primary-400 group-hover:scale-110 transition-transform duration-300 border border-primary-500/20">
              <span className="text-3xl">🛠️</span>
            </div>
            <div className="text-right">
              <div className="text-4xl font-display font-bold text-white mb-1">
                {systemMetrics.activeTools}
              </div>
              <div className="text-[10px] text-neutral-400 uppercase tracking-widest font-bold">
                Herramientas
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 relative z-10">
            <div className="w-2 h-2 rounded-full bg-success shadow-[0_0_8px_#10b981] animate-pulse" />
            <span className="text-xs text-neutral-400 font-medium">Listas para usar</span>
          </div>
        </div>

        <div className="glass-panel p-6 rounded-2xl hover:bg-base-900/60 hover:border-success/30 transition-all duration-300 group cursor-pointer relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-success/10 rounded-full blur-2xl -mr-10 -mt-10 group-hover:bg-success/20 transition-colors" />
          <div className="flex items-center justify-between mb-4 relative z-10">
            <div className="p-3 rounded-xl bg-success/10 text-success group-hover:scale-110 transition-transform duration-300 border border-success/20">
              <span className="text-3xl">🔌</span>
            </div>
            <div className="text-right">
              <div className="text-4xl font-display font-bold text-white mb-1">
                {systemMetrics.integrations}
              </div>
              <div className="text-[10px] text-neutral-400 uppercase tracking-widest font-bold">
                Integraciones
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 relative z-10">
            <div className="w-2 h-2 rounded-full bg-success shadow-[0_0_8px_#10b981] animate-pulse" />
            <span className="text-xs text-neutral-400 font-medium">Conectadas</span>
          </div>
        </div>

        <div className="glass-panel p-6 rounded-2xl hover:bg-base-900/60 hover:border-warning/30 transition-all duration-300 group cursor-pointer relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-warning/10 rounded-full blur-2xl -mr-10 -mt-10 group-hover:bg-warning/20 transition-colors" />
          <div className="flex items-center justify-between mb-4 relative z-10">
            <div className="p-3 rounded-xl bg-warning/10 text-warning group-hover:scale-110 transition-transform duration-300 border border-warning/20">
              <span className="text-3xl">⚡</span>
            </div>
            <div className="text-right">
              <div className="text-4xl font-display font-bold text-white mb-1">
                {systemMetrics.requests}
              </div>
              <div className="text-[10px] text-neutral-400 uppercase tracking-widest font-bold">
                Requests
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 relative z-10">
            <span className="text-xs text-neutral-400 font-medium">Latencia: </span>
            <span className="text-xs text-success font-mono font-bold bg-success/10 px-2 py-0.5 rounded border border-success/20">
              {systemMetrics.avgLatency}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* System Health */}
        <div className="glass-panel p-6 rounded-2xl lg:col-span-2">
          <PanelHeader
            icon="💚"
            title="Estado del Sistema"
            right={
              <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-success/10 border border-success/20 shadow-[0_0_10px_rgba(16,185,129,0.2)]">
                <StatusDot color="success" pulse />
                <Badge color="success" className="tracking-wide uppercase">
                  Operacional
                </Badge>
              </div>
            }
            className="mb-8"
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-5 rounded-xl bg-base-900/40 border border-white/5 relative overflow-hidden group hover:border-accent-500/20 transition-colors">
              <div className="absolute inset-0 bg-gradient-to-br from-accent-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="flex items-center justify-between mb-4 relative z-10">
                <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
                  Uptime
                </span>
                <span className="text-accent-400 font-mono font-bold text-lg">
                  {systemMetrics.uptime}
                </span>
              </div>
              <div className="w-full bg-base-950 rounded-full h-2 border border-white/5 relative z-10">
                <div
                  className="bg-gradient-to-r from-accent-600 to-accent-400 h-2 rounded-full shadow-[0_0_10px_#00e5ff]"
                  style={{ width: '98%' }}
                />
              </div>
            </div>

            <div className="p-5 rounded-xl bg-base-900/40 border border-white/5 relative overflow-hidden group hover:border-primary-500/20 transition-colors">
              <div className="absolute inset-0 bg-gradient-to-br from-primary-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="flex items-center justify-between mb-4 relative z-10">
                <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
                  CPU Load
                </span>
                <span className="text-primary-400 font-mono font-bold text-lg">23%</span>
              </div>
              <div className="w-full bg-base-950 rounded-full h-2 border border-white/5 relative z-10">
                <div
                  className="bg-gradient-to-r from-primary-600 to-primary-400 h-2 rounded-full shadow-[0_0_10px_#d946ef]"
                  style={{ width: '23%' }}
                />
              </div>
            </div>

            <div className="p-5 rounded-xl bg-base-900/40 border border-white/5 relative overflow-hidden group hover:border-success/20 transition-colors">
              <div className="absolute inset-0 bg-gradient-to-br from-success/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="flex items-center justify-between mb-4 relative z-10">
                <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
                  Memory
                </span>
                <span className="text-success font-mono font-bold text-lg">512MB</span>
              </div>
              <div className="w-full bg-base-950 rounded-full h-2 border border-white/5 relative z-10">
                <div
                  className="bg-gradient-to-r from-green-600 to-success h-2 rounded-full shadow-[0_0_10px_#10b981]"
                  style={{ width: '45%' }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="glass-panel p-6 rounded-2xl">
          <PanelHeader icon="📊" title="Actividad Reciente" />
          <div className="space-y-4">
            {recentActivity.map((activity, idx) => (
              <div
                key={idx}
                className="flex items-center gap-4 p-3 rounded-xl bg-base-900/40 border border-white/5 hover:border-accent-500/20 hover:bg-base-900/60 transition-all group"
              >
                <div className="flex-shrink-0 relative">
                  <div className="w-2 h-2 rounded-full bg-success shadow-[0_0_5px_#10b981]" />
                  <div className="absolute inset-0 bg-success rounded-full animate-ping opacity-50" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-neutral-300 truncate group-hover:text-white transition-colors">
                    {activity.action}
                  </p>
                </div>
                <div className="flex-shrink-0">
                  <span className="text-[10px] text-neutral-500 font-mono bg-base-950 px-2 py-1 rounded border border-white/5">
                    {activity.time}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="glass-panel p-6 rounded-2xl">
        <h2 className="text-lg font-display font-bold text-white mb-6 flex items-center gap-3">
          <span className="text-2xl">⚡</span>
          Acciones Rápidas
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action) => (
            <button
              key={action.id}
              className="p-5 rounded-xl bg-base-900/40 border border-white/5 hover:border-accent-500/30 hover:bg-accent-500/5 hover:-translate-y-1 transition-all duration-300 group text-left relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-white/5 to-transparent rounded-full -mr-8 -mt-8 transition-transform group-hover:scale-150" />
              <div className="text-3xl mb-4 group-hover:scale-110 transition-transform duration-300 relative z-10">
                {action.icon}
              </div>
              <h3 className="text-sm font-bold text-white mb-1 relative z-10 group-hover:text-accent-400 transition-colors">
                {action.title}
              </h3>
              <p className="text-xs text-neutral-500 relative z-10">{action.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Agent Status Grid */}
      <div className="glass-panel p-6 rounded-2xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-display font-bold text-white flex items-center gap-3">
            <span className="text-2xl">🤖</span>
            Estado de Agentes
          </h2>
          <button className="text-xs font-bold text-accent-400 hover:text-accent-300 transition-colors uppercase tracking-wider border border-accent-500/20 px-3 py-1.5 rounded-lg hover:bg-accent-500/10">
            Ver todos →
          </button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {[
            'orchestrator',
            'developer',
            'analyst',
            'research',
            'rag',
            'business',
            'content',
            'guardian',
          ].map((agent) => (
            <div
              key={agent}
              className="p-4 rounded-xl bg-base-900/40 border border-white/5 hover:border-accent-500/30 hover:bg-base-900/60 transition-all group cursor-pointer"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="relative">
                  <div className="w-2 h-2 rounded-full bg-success shadow-[0_0_5px_#10b981]" />
                  <div className="absolute inset-0 bg-success rounded-full animate-ping opacity-50" />
                </div>
                <span className="text-sm text-neutral-600 group-hover:text-accent-400 transition-colors transform group-hover:rotate-90 duration-300">
                  ⚙️
                </span>
              </div>
              <p className="text-xs font-mono font-bold text-neutral-300 truncate group-hover:text-white transition-colors">
                {agent}
              </p>
              <p className="text-[10px] text-neutral-500 mt-1">IDLE</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
