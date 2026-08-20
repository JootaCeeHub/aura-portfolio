import React from 'react';
import { Badge, Button, StatusDot } from './ui';
import { AGENT_ROLES, AGENT_TOOLS } from './constants';

export function WelcomePage({
  onEnter,
  onNavigateToDocs,
}: {
  onEnter: () => void;
  onNavigateToDocs: () => void;
}) {
  const agentsCount = AGENT_ROLES.length;
  const toolsCount = AGENT_TOOLS.length;

  return (
    <div className="min-h-screen bg-base-950 flex flex-col items-center justify-center p-8 relative overflow-hidden font-sans selection:bg-accent-500/30">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Radial Gradient */}
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-primary-600/20 rounded-full blur-[120px] animate-pulse-slow" />
        <div
          className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-accent-600/20 rounded-full blur-[120px] animate-pulse-slow"
          style={{ animationDelay: '2s' }}
        />

        {/* Grid Pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(to right, #4f4f4f 1px, transparent 1px), linear-gradient(to bottom, #4f4f4f 1px, transparent 1px)`,
            backgroundSize: '40px 40px',
          }}
        />
      </div>

      <div className="relative z-10 max-w-7xl w-full flex flex-col items-center">
        {/* Hero Section */}
        <div className="text-center mb-20 animate-fade-in">
          <div className="relative inline-block mb-8 group cursor-default">
            <div className="absolute inset-0 bg-gradient-to-r from-accent-500 to-primary-500 rounded-full blur-2xl opacity-20 group-hover:opacity-40 transition-opacity duration-500" />
            <div className="relative w-32 h-32 rounded-full bg-base-900/80 border border-white/10 flex items-center justify-center backdrop-blur-md shadow-2xl group-hover:scale-105 transition-transform duration-500">
              <span className="text-6xl animate-float">🧠</span>
            </div>
            {/* Orbiting Particles */}
            <div className="absolute inset-0 animate-spin-slow pointer-events-none">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-4 w-3 h-3 bg-accent-400 rounded-full shadow-[0_0_10px_rgba(0,240,255,0.8)]" />
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-4 w-2 h-2 bg-primary-400 rounded-full shadow-[0_0_10px_rgba(217,70,239,0.8)]" />
            </div>
          </div>

          <h1 className="text-7xl font-display font-bold mb-6 tracking-tight">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-white via-neutral-200 to-neutral-400">
              AURA
            </span>
            <span className="text-accent-400">.</span>
            <span className="text-primary-400">BRAIN</span>
          </h1>

          <p className="text-2xl text-neutral-400 max-w-2xl mx-auto font-light leading-relaxed">
            Sistema de Inteligencia Cognitiva Distribuida
          </p>
        </div>

        {/* Capabilities Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16 w-full">
          {[
            {
              icon: '🤖',
              title: 'Agentes Autónomos',
              count: `${agentsCount} Roles`,
              desc: 'Orquestación multi-agente',
              color: 'accent',
            },
            {
              icon: '⚡',
              title: 'Herramientas',
              count: `${toolsCount} Herramientas`,
              desc: 'Ejecución de alto rendimiento',
              color: 'primary',
            },
            {
              icon: '🔗',
              title: 'Integraciones',
              count: 'Empresariales',
              desc: 'Conectividad universal',
              color: 'success',
            },
            {
              icon: '📡',
              title: 'Observabilidad',
              count: 'Tiempo Real',
              desc: 'Monitoreo profundo',
              color: 'warning',
            },
          ].map((item, idx) => (
            <div
              key={idx}
              className="glass-panel p-8 rounded-2xl hover:bg-base-800/60 hover:border-white/10 hover:-translate-y-1 transition-all duration-300 group cursor-default animate-slide-up"
              style={{ animationDelay: `${0.1 * (idx + 1)}s` }}
            >
              <div className="flex items-start justify-between mb-4">
                <span className="text-4xl group-hover:scale-110 transition-transform duration-300">
                  {item.icon}
                </span>
                <div
                  className={`w-2 h-2 rounded-full bg-${item.color}-400 shadow-[0_0_10px_currentColor] opacity-50 group-hover:opacity-100 transition-opacity`}
                />
              </div>
              <h3 className="text-xl font-display font-bold text-neutral-100 mb-1">{item.title}</h3>
              <Badge color={item.color as any} className="mb-3">
                {item.count}
              </Badge>
              <p className="text-sm text-neutral-500 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div
          className="flex flex-col sm:flex-row gap-6 items-center animate-slide-up"
          style={{ animationDelay: '0.6s' }}
        >
          <Button
            onClick={onEnter}
            className="px-10 py-4 text-lg shadow-[0_0_30px_rgba(0,240,255,0.2)]"
          >
            {' '}
            <span className="mr-2">🚀</span> Iniciar Sistema
          </Button>
          <Button
            variant="secondary"
            onClick={onNavigateToDocs}
            className="px-10 py-4 text-lg backdrop-blur-md"
          >
            {' '}
            <span className="mr-2">📚</span> Documentación
          </Button>
        </div>

        {/* Footer Status */}
        <div
          className="mt-20 flex items-center gap-8 text-xs font-medium text-neutral-600 animate-fade-in"
          style={{ animationDelay: '1s' }}
        >
          <div className="flex items-center gap-2">
            <StatusDot color="success" pulse className="w-1.5 h-1.5" />
            <span>SYSTEM ONLINE</span>
          </div>
          <div className="w-1 h-1 rounded-full bg-neutral-800" />
          <div>V 2.0.0-ALPHA</div>
          <div className="w-1 h-1 rounded-full bg-neutral-800" />
          <div>PORT: 3000</div>
        </div>
      </div>
    </div>
  );
}
