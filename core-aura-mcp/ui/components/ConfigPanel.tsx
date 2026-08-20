import React, { useMemo, useState } from 'react';
import { Button, Input } from './ui';
import { AGENT_ROLES, AGENT_TOOLS } from './constants';
import { ConfigPanelGeneral } from './ConfigPanel/ConfigPanelGeneral';

interface ConfigSection {
  id: string;
  label: string;
  icon: string;
}

const sections: ConfigSection[] = [
  { id: 'general', label: 'General', icon: '⚙️' },
  { id: 'integrations', label: 'Integraciones', icon: '🔌' },
  { id: 'agents', label: 'Agentes', icon: '🤖' },
  { id: 'tools', label: 'Herramientas', icon: '🛠️' },
];

const INTEGRATION_CATEGORIES = [
  { id: 'llm', label: 'Modelos LLM', icon: '🧠' },
  { id: 'database', label: 'Bases de Datos', icon: '💾' },
  { id: 'automation', label: 'Automatización', icon: '⚡' },
  { id: 'external', label: 'Servicios Externos', icon: '🌐' },
];

export function ConfigPanel() {
  const [activeTab, setActiveTab] = useState('general');
  const [integrationCategory, setIntegrationCategory] = useState('llm');
  const [agentSearch, setAgentSearch] = useState('');
  const [toolSearch, setToolSearch] = useState('');

  const agentQuery = agentSearch.trim().toLowerCase();
  const toolQuery = toolSearch.trim().toLowerCase();

  const filteredAgents = useMemo(() => {
    if (!agentQuery) return AGENT_ROLES;
    return AGENT_ROLES.filter((a) => a.toLowerCase().includes(agentQuery));
  }, [agentQuery]);

  const filteredTools = useMemo(() => {
    if (!toolQuery) return AGENT_TOOLS;
    return AGENT_TOOLS.filter((t) => t.toLowerCase().includes(toolQuery));
  }, [toolQuery]);

  return (
    <div className="glass-panel rounded-xl p-0 overflow-hidden flex flex-col h-full min-h-[500px]">
      <div className="p-6 border-b border-white/10 flex items-center justify-between bg-base-900/50">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-accent-500/10 text-accent-400">
            <span className="text-xl">⚙️</span>
          </div>
          <div>
            <h2 className="text-lg font-bold text-neutral-100 tracking-wide">
              CONFIGURACIÓN DEL SISTEMA
            </h2>
            <p className="text-xs text-neutral-500 font-mono">
              AURA CORE v1.0.0 • {AGENT_ROLES.length} Agentes • {AGENT_TOOLS.length} Herramientas
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Tabs */}
        <div className="w-64 bg-base-900/30 border-r border-white/5 p-4 space-y-2 overflow-y-auto">
          {sections.map((s) => (
            <button
              key={s.id}
              onClick={() => setActiveTab(s.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                activeTab === s.id
                  ? 'bg-accent-500/10 text-accent-400 border border-accent-500/20 shadow-[0_0_10px_rgba(0,229,255,0.1)]'
                  : 'text-neutral-400 hover:bg-white/5 hover:text-neutral-200'
              }`}
            >
              <span>{s.icon}</span>
              {s.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 p-8 overflow-y-auto bg-black/20">
          {activeTab === 'general' && (
            <ConfigPanelGeneral
              onSave={(config) => {
                console.log('Configuración guardada:', config);
                // TODO: Llamar al backend para persistir
              }}
            />
          )}

          {activeTab === 'integrations' && (
            <div className="space-y-6 animate-fade-in">
              {/* Integration Category Tabs */}
              <div className="flex gap-2 border-b border-white/10 pb-4">
                {INTEGRATION_CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setIntegrationCategory(cat.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      integrationCategory === cat.id
                        ? 'bg-accent-500/10 text-accent-400 border border-accent-500/20'
                        : 'text-neutral-400 hover:bg-white/5 hover:text-neutral-200'
                    }`}
                  >
                    <span>{cat.icon}</span>
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* LLM Integrations */}
              {integrationCategory === 'llm' && (
                <div className="space-y-6">
                  <div className="p-4 rounded-lg bg-accent-500/5 border border-accent-500/10">
                    <div className="flex items-start gap-3">
                      <span className="text-accent-400 text-xl">ℹ️</span>
                      <p className="text-sm text-neutral-300 leading-relaxed">
                        Configura los proveedores de Inteligencia Artificial. AURA usará estos
                        modelos para el razonamiento cognitivo y la generación de respuestas.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-accent-400 uppercase tracking-widest border-b border-white/10 pb-2">
                      OpenAI
                    </h3>
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <label className="text-xs text-neutral-400 font-medium">
                          API Key (OPENAI_API_KEY)
                        </label>
                        <input
                          className="input w-full font-mono text-neutral-500"
                          type="password"
                          placeholder="sk-..."
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs text-neutral-400 font-medium">
                          Modelo por Defecto (AURA_MODEL)
                        </label>
                        <select className="input w-full">
                          <option>gpt-4-turbo</option>
                          <option>gpt-4o</option>
                          <option>gpt-3.5-turbo</option>
                          <option>gpt-4o-mini</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 mt-8">
                    <h3 className="text-sm font-bold text-primary-400 uppercase tracking-widest border-b border-white/10 pb-2">
                      Anthropic
                    </h3>
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <label className="text-xs text-neutral-400 font-medium">API Key</label>
                        <input
                          className="input w-full font-mono text-neutral-500"
                          type="password"
                          placeholder="sk-ant-..."
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 mt-8">
                    <h3 className="text-sm font-bold text-green-400 uppercase tracking-widest border-b border-white/10 pb-2">
                      Tavily (Research)
                    </h3>
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <label className="text-xs text-neutral-400 font-medium">
                          API Key (TAVILY_API_KEY)
                        </label>
                        <input
                          className="input w-full font-mono text-neutral-500"
                          type="password"
                          placeholder="tvly-..."
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Database Integrations */}
              {integrationCategory === 'database' && (
                <div className="space-y-6">
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-green-400 uppercase tracking-widest border-b border-white/10 pb-2">
                      Supabase
                    </h3>
                    <div className="grid grid-cols-1 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs text-neutral-400 font-medium">
                          Project URL (SUPABASE_URL)
                        </label>
                        <input
                          className="input w-full font-mono"
                          placeholder="https://xyz.supabase.co"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs text-neutral-400 font-medium">
                          Anon Key (SUPABASE_ANON_KEY)
                        </label>
                        <input
                          className="input w-full font-mono"
                          type="password"
                          placeholder="eyJ..."
                        />
                      </div>
                    </div>
                    <div className="flex justify-end mt-2">
                      <button className="btn btn-secondary text-xs">Probar Conexión</button>
                    </div>
                  </div>

                  <div className="space-y-4 mt-8">
                    <h3 className="text-sm font-bold text-purple-400 uppercase tracking-widest border-b border-white/10 pb-2">
                      Graphiti (Knowledge Graph)
                    </h3>
                    <div className="space-y-2">
                      <label className="text-xs text-neutral-400 font-medium">
                        Base URL (GRAPHITI_BASE_URL)
                      </label>
                      <input
                        className="input w-full font-mono"
                        placeholder="http://localhost:8000"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Automation Integrations */}
              {integrationCategory === 'automation' && (
                <div className="space-y-6">
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-pink-400 uppercase tracking-widest border-b border-white/10 pb-2">
                      n8n Workflows
                    </h3>
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <label className="text-xs text-neutral-400 font-medium">
                          Base URL (N8N_BASE_URL)
                        </label>
                        <input
                          className="input w-full font-mono"
                          placeholder="https://n8n.mi-empresa.com"
                        />
                      </div>
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-base-900/50 border border-white/5">
                        <input
                          type="checkbox"
                          className="w-4 h-4 rounded border-neutral-600 bg-base-800 text-accent-500 focus:ring-accent-500"
                          defaultChecked
                        />
                        <span className="text-sm text-neutral-300">
                          Habilitar ejecución automática de workflows
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 mt-8">
                    <h3 className="text-sm font-bold text-orange-400 uppercase tracking-widest border-b border-white/10 pb-2">
                      Make (Integromat)
                    </h3>
                    <div className="space-y-2">
                      <label className="text-xs text-neutral-400 font-medium">
                        API Key (MAKE_API_KEY)
                      </label>
                      <input className="input w-full font-mono" type="password" placeholder="..." />
                    </div>
                  </div>

                  <div className="space-y-4 mt-8">
                    <h3 className="text-sm font-bold text-blue-400 uppercase tracking-widest border-b border-white/10 pb-2">
                      Power Automate
                    </h3>
                    <div className="space-y-2">
                      <label className="text-xs text-neutral-400 font-medium">
                        MS Graph Token (MS_GRAPH_TOKEN)
                      </label>
                      <input className="input w-full font-mono" type="password" placeholder="..." />
                    </div>
                  </div>

                  <div className="space-y-4 mt-8">
                    <h3 className="text-sm font-bold text-yellow-400 uppercase tracking-widest border-b border-white/10 pb-2">
                      Zapier
                    </h3>
                    <div className="space-y-2">
                      <label className="text-xs text-neutral-400 font-medium">
                        Token (ZAPIER_TOKEN)
                      </label>
                      <input className="input w-full font-mono" type="password" placeholder="..." />
                    </div>
                  </div>
                </div>
              )}

              {/* External Services */}
              {integrationCategory === 'external' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* GitHub */}
                    <div className="p-4 rounded-xl bg-base-900/40 border border-white/5 hover:border-white/10 transition-all">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">🐙</span>
                          <span className="font-bold text-neutral-200">GitHub</span>
                        </div>
                        <div className="w-2 h-2 rounded-full bg-neutral-600" />
                      </div>
                      <p className="text-xs text-neutral-500 mb-4">
                        Acceso a repositorios y gestión de issues.
                      </p>
                      <div className="space-y-2 mb-3">
                        <label className="text-xs text-neutral-400 font-medium">
                          Token (GITHUB_TOKEN)
                        </label>
                        <input
                          className="input w-full font-mono text-xs"
                          type="password"
                          placeholder="ghp_..."
                        />
                      </div>
                      <button className="btn btn-secondary w-full text-xs">Probar Conexión</button>
                    </div>

                    {/* Microsoft Graph */}
                    <div className="p-4 rounded-xl bg-base-900/40 border border-white/5 hover:border-white/10 transition-all">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">🟦</span>
                          <span className="font-bold text-neutral-200">Microsoft 365</span>
                        </div>
                        <div className="w-2 h-2 rounded-full bg-neutral-600" />
                      </div>
                      <p className="text-xs text-neutral-500 mb-4">SharePoint, Outlook y Teams.</p>
                      <div className="space-y-2 mb-3">
                        <label className="text-xs text-neutral-400 font-medium">Graph Token</label>
                        <input
                          className="input w-full font-mono text-xs"
                          type="password"
                          placeholder="..."
                        />
                      </div>
                      <button className="btn btn-secondary w-full text-xs">Conectar</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'agents' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-accent-400 uppercase tracking-widest">
                  Agentes Registrados ({filteredAgents.length})
                </h3>
                <Input
                  className="w-64 text-xs"
                  placeholder="Buscar agente..."
                  value={agentSearch}
                  onChange={(e) => setAgentSearch(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredAgents.map((agent) => (
                  <div
                    key={agent}
                    className="p-3 rounded-lg bg-base-900/40 border border-white/5 hover:border-accent-500/30 transition-all group"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                        <span className="text-sm font-mono text-neutral-200 group-hover:text-accent-400 transition-colors">
                          {agent}
                        </span>
                      </div>
                      <button className="text-neutral-600 hover:text-accent-400 text-xs">⚙️</button>
                    </div>
                    <div className="text-xs text-neutral-500">Estado: Activo</div>
                  </div>
                ))}
              </div>

              <div className="mt-6 p-4 rounded-lg bg-accent-500/5 border border-accent-500/10">
                <div className="flex items-start gap-3">
                  <span className="text-accent-400 text-xl">💡</span>
                  <div>
                    <p className="text-sm text-neutral-300 font-medium mb-1">Gestión de Agentes</p>
                    <p className="text-xs text-neutral-500">
                      Los agentes se cargan automáticamente desde{' '}
                      <code className="text-accent-400">agents/roles</code> y{' '}
                      <code className="text-accent-400">agents/core</code>. Usa las herramientas{' '}
                      <code className="text-accent-400">core.agent.*</code> para crear, listar o
                      invocar agentes.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'tools' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-accent-400 uppercase tracking-widest">
                  Herramientas Disponibles ({filteredTools.length})
                </h3>
                <Input
                  className="w-64 text-xs"
                  placeholder="Buscar herramienta..."
                  value={toolSearch}
                  onChange={(e) => setToolSearch(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredTools.map((tool) => (
                  <div
                    key={tool}
                    className="p-4 rounded-lg bg-base-900/40 border border-white/5 hover:border-primary-500/30 transition-all group"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">🛠️</span>
                        <span className="text-sm font-mono text-neutral-200 group-hover:text-primary-400 transition-colors">
                          {tool}
                        </span>
                      </div>
                      <div className="w-2 h-2 rounded-full bg-success" />
                    </div>
                    <div className="text-xs text-neutral-500">Tipo: Agent Tool</div>
                  </div>
                ))}
              </div>

              <div className="mt-6 space-y-4">
                <h3 className="text-sm font-bold text-primary-400 uppercase tracking-widest border-b border-white/10 pb-2">
                  Categorías de Herramientas Core
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    'Observabilidad',
                    'Routing',
                    'Repository',
                    'SQL Tools',
                    'Agent Management',
                    'Automation Hub',
                  ].map((cat) => (
                    <div key={cat} className="p-3 rounded-lg bg-base-900/40 border border-white/5">
                      <div className="text-xs text-neutral-400 mb-1">Categoría</div>
                      <div className="text-sm font-medium text-neutral-200">{cat}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
