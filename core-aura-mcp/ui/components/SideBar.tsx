import React from 'react';
import { StatusDot } from './ui';
import { SectionId } from './types';

interface SideBarProps {
  section: SectionId;
  onSectionChange: (s: SectionId) => void;
}

const menuItems: Array<{ id: SectionId; label: string; icon: string }> = [
  { id: 'dashboard', label: 'PANEL DE CONTROL', icon: '📊' },
  { id: 'map', label: 'MAPA COGNITIVO', icon: '🧠' },
  { id: 'console', label: 'CONSOLA', icon: '💻' },
  { id: 'logs', label: 'REGISTROS', icon: '📝' },
  { id: 'docs', label: 'DOCUMENTACIÓN', icon: '📚' },
  { id: 'settings', label: 'CONFIGURACIÓN', icon: '⚙️' },
];

export function SideBar({ section, onSectionChange }: SideBarProps) {
  return (
    <div className="w-72 border-r border-white/5 bg-base-950/50 backdrop-blur-xl h-full flex flex-col relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-0 left-0 w-full h-64 bg-accent-500/5 blur-[100px] pointer-events-none" />

      <div className="px-8 py-8 relative z-10">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent-500 to-primary-500 flex items-center justify-center shadow-lg shadow-accent-500/20">
            <span className="text-lg">🧠</span>
          </div>
          <div className="text-xl font-display font-bold text-white tracking-wide">AURA</div>
        </div>
        <div className="text-[10px] text-neutral-500 font-mono uppercase tracking-[0.2em] pl-11">
          Sistema Cognitivo
        </div>
      </div>

      <div className="flex flex-col px-4 gap-2 mt-2 relative z-10">
        {menuItems.map((item) => {
          const isActive = section === item.id;
          return (
            <button
              key={item.id}
              className={`
                group flex items-center gap-4 px-4 py-3.5 text-xs font-bold tracking-wider rounded-xl transition-all duration-300 relative overflow-hidden
                ${
                  isActive
                    ? 'bg-white/5 text-accent-400 shadow-[0_0_20px_rgba(0,0,0,0.2)]'
                    : 'text-neutral-500 hover:bg-white/5 hover:text-neutral-200'
                }
              `}
              onClick={() => onSectionChange(item.id)}
              aria-current={isActive ? 'page' : undefined}
            >
              {isActive && (
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-accent-500 shadow-[0_0_10px_#00e5ff]" />
              )}

              <span
                className={`text-lg transition-transform duration-300 ${isActive ? 'scale-110 text-accent-400' : 'group-hover:scale-110 grayscale group-hover:grayscale-0'}`}
              >
                {item.icon}
              </span>

              <span className="relative z-10">{item.label}</span>

              {isActive && (
                <div className="absolute inset-0 bg-gradient-to-r from-accent-500/10 to-transparent opacity-50" />
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-auto p-6 border-t border-white/5 relative z-10">
        <div className="p-4 rounded-xl bg-base-900/50 border border-white/5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-neutral-500 uppercase">
              Estado del Sistema
            </span>
            <StatusDot color="success" pulse className="w-1.5 h-1.5 shadow-[0_0_5px_#10b981]" />
          </div>
          <div className="w-full bg-base-800 rounded-full h-1 mb-2 overflow-hidden">
            <div className="bg-accent-500 h-full w-[85%] shadow-[0_0_10px_#00e5ff]" />
          </div>
          <div className="flex justify-between text-[10px] text-neutral-400 font-mono">
            <span>CPU: 45%</span>
            <span>MEM: 2.1GB</span>
          </div>
        </div>
      </div>
    </div>
  );
}
