import React, { useMemo, useState } from 'react';
import { Input } from './ui';
import { DOC_SECTIONS, AGENTS_DATA, TOOLS_DATA } from './constants';

export function DocumentationPanel() {
  const [activeSection, setActiveSection] = useState('getting-started');
  const [searchQuery, setSearchQuery] = useState('');

  const q = searchQuery.trim().toLowerCase();
  const filteredAgents = useMemo(() => {
    if (!q) return AGENTS_DATA;
    return AGENTS_DATA.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.role.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q)
    );
  }, [q]);

  const filteredToolCategories = useMemo(() => {
    if (!q) return TOOLS_DATA;
    return TOOLS_DATA.map((cat) => {
      const tools = cat.tools.filter((t) => t.toLowerCase().includes(q));
      const matchDesc =
        cat.description.toLowerCase().includes(q) || cat.category.toLowerCase().includes(q);
      if (tools.length > 0 || matchDesc) {
        return { ...cat, tools: tools.length > 0 ? tools : cat.tools };
      }
      return null;
    }).filter(Boolean) as typeof TOOLS_DATA;
  }, [q]);

  return (
    <div className="flex h-full overflow-hidden">
      {/* Sidebar Navigation */}
      <div className="w-64 bg-base-900/30 border-r border-white/5 p-4 overflow-y-auto">
        <div className="mb-6">
          <Input
            type="text"
            placeholder="Buscar en docs..."
            className="text-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <nav className="space-y-2">
          {DOC_SECTIONS.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                activeSection === section.id
                  ? 'bg-accent-500/10 text-accent-400 border border-accent-500/20'
                  : 'text-neutral-400 hover:bg-white/5 hover:text-neutral-200'
              }`}
            >
              <span>{section.icon}</span>
              {section.title}
            </button>
          ))}
        </nav>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-8 bg-black/20">
        {activeSection === 'getting-started' && (
          <div className="max-w-4xl space-y-8 animate-fade-in">
            <div>
              <h1 className="text-3xl font-bold text-neutral-100 mb-4">🚀 Getting Started</h1>
              <p className="text-neutral-400 leading-relaxed">
                AURA es un sistema cognitivo distribuido que coordina múltiples agentes
                especializados, herramientas avanzadas e integraciones empresariales para resolver
                problemas complejos.
              </p>
            </div>

            <div className="glass-panel p-6 rounded-xl">
              <h2 className="text-xl font-bold text-accent-400 mb-4">¿Qué es AURA?</h2>
              <p className="text-neutral-300 mb-4">
                AURA (Autonomous Universal Reasoning Agent) es una plataforma de orquestación de IA
                que utiliza el protocolo MCP (Model Context Protocol) para coordinar agentes
                especializados.
              </p>
              <ul className="space-y-2 text-neutral-400">
                <li className="flex items-start gap-2">
                  <span className="text-accent-400">•</span>
                  <span>
                    <strong>22 Agentes Especializados</strong>: Cada uno con capacidades únicas
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-accent-400">•</span>
                  <span>
                    <strong>12 Herramientas</strong>: Para automatización y procesamiento
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-accent-400">•</span>
                  <span>
                    <strong>Integraciones</strong>: OpenAI, Anthropic, Supabase, n8n, y más
                  </span>
                </li>
              </ul>
            </div>

            <div className="glass-panel p-6 rounded-xl">
              <h2 className="text-xl font-bold text-primary-400 mb-4">Primeros Pasos</h2>
              <ol className="space-y-4 text-neutral-300">
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-8 h-8 rounded-full bg-accent-500/10 text-accent-400 flex items-center justify-center font-bold">
                    1
                  </span>
                  <div>
                    <strong>Configurar Integraciones</strong>
                    <p className="text-sm text-neutral-500 mt-1">
                      Ve a la pestaña "Configuración" y añade tus API keys
                    </p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-8 h-8 rounded-full bg-accent-500/10 text-accent-400 flex items-center justify-center font-bold">
                    2
                  </span>
                  <div>
                    <strong>Explorar Agentes</strong>
                    <p className="text-sm text-neutral-500 mt-1">
                      Revisa los 22 agentes disponibles y sus capacidades
                    </p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-8 h-8 rounded-full bg-accent-500/10 text-accent-400 flex items-center justify-center font-bold">
                    3
                  </span>
                  <div>
                    <strong>Invocar Herramientas</strong>
                    <p className="text-sm text-neutral-500 mt-1">
                      Usa la consola cognitiva para ejecutar comandos
                    </p>
                  </div>
                </li>
              </ol>
            </div>
          </div>
        )}

        {activeSection === 'architecture' && (
          <div className="max-w-4xl space-y-8 animate-fade-in">
            <div>
              <h1 className="text-3xl font-bold text-neutral-100 mb-4">🏗️ Architecture Overview</h1>
              <p className="text-neutral-400 leading-relaxed">
                Arquitectura modular basada en el protocolo MCP (Model Context Protocol)
              </p>
            </div>

            <div className="glass-panel p-6 rounded-xl">
              <h2 className="text-xl font-bold text-accent-400 mb-4">Componentes Principales</h2>
              <div className="space-y-4">
                <div className="p-4 bg-base-900/40 rounded-lg border border-white/5">
                  <h3 className="font-bold text-neutral-200 mb-2">🧠 Core Orchestrator</h3>
                  <p className="text-sm text-neutral-400">
                    Coordina la ejecución de agentes y gestiona el flujo de trabajo global
                  </p>
                </div>
                <div className="p-4 bg-base-900/40 rounded-lg border border-white/5">
                  <h3 className="font-bold text-neutral-200 mb-2">🤖 Agent Layer</h3>
                  <p className="text-sm text-neutral-400">
                    22 agentes especializados con capacidades únicas
                  </p>
                </div>
                <div className="p-4 bg-base-900/40 rounded-lg border border-white/5">
                  <h3 className="font-bold text-neutral-200 mb-2">🛠️ Tool Layer</h3>
                  <p className="text-sm text-neutral-400">
                    Herramientas para observabilidad, routing, repository, SQL y automatización
                  </p>
                </div>
                <div className="p-4 bg-base-900/40 rounded-lg border border-white/5">
                  <h3 className="font-bold text-neutral-200 mb-2">🔌 Integration Layer</h3>
                  <p className="text-sm text-neutral-400">
                    Conectores para LLMs, bases de datos y plataformas de automatización
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeSection === 'agents' && (
          <div className="max-w-4xl space-y-8 animate-fade-in">
            <div>
              <h1 className="text-3xl font-bold text-neutral-100 mb-4">🤖 Agents Guide</h1>
              <p className="text-neutral-400 leading-relaxed">
                Guía completa de los 22 agentes especializados disponibles en AURA
              </p>
            </div>

            <div className="grid gap-4">
              {filteredAgents.map((agent) => (
                <div
                  key={agent.name}
                  className="glass-panel p-5 rounded-xl hover:border-accent-500/30 transition-all"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-mono text-accent-400 font-bold">{agent.name}</h3>
                      <p className="text-sm text-primary-400 font-medium">{agent.role}</p>
                    </div>
                    <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                  </div>
                  <p className="text-sm text-neutral-400">{agent.description}</p>
                </div>
              ))}
            </div>

            <div className="glass-panel p-6 rounded-xl bg-accent-500/5 border-accent-500/10">
              <h3 className="font-bold text-accent-400 mb-3">💡 Cómo Invocar Agentes</h3>
              <pre className="bg-base-950 p-4 rounded-lg text-sm text-neutral-300 overflow-x-auto">
                {`// Invocar un agente
core.agent.invoke({
  agent: "developer",
  input: "Crea una función para validar emails",
  context: {}
})`}
              </pre>
            </div>
          </div>
        )}

        {activeSection === 'tools' && (
          <div className="max-w-4xl space-y-8 animate-fade-in">
            <div>
              <h1 className="text-3xl font-bold text-neutral-100 mb-4">🛠️ Tools Reference</h1>
              <p className="text-neutral-400 leading-relaxed">
                Referencia completa de herramientas disponibles en AURA
              </p>
            </div>

            {filteredToolCategories.map((category) => (
              <div key={category.category} className="glass-panel p-6 rounded-xl">
                <h2 className="text-xl font-bold text-primary-400 mb-3">{category.category}</h2>
                <p className="text-sm text-neutral-400 mb-4">{category.description}</p>
                <div className="space-y-2">
                  {category.tools.map((tool) => (
                    <div key={tool} className="p-3 bg-base-900/40 rounded-lg border border-white/5">
                      <code className="text-accent-400 font-mono text-sm">{tool}</code>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeSection === 'integrations' && (
          <div className="max-w-4xl space-y-8 animate-fade-in">
            <div>
              <h1 className="text-3xl font-bold text-neutral-100 mb-4">🔌 Integrations Setup</h1>
              <p className="text-neutral-400 leading-relaxed">
                Guía de configuración para todas las integraciones soportadas
              </p>
            </div>

            <div className="glass-panel p-6 rounded-xl">
              <h2 className="text-xl font-bold text-accent-400 mb-4">OpenAI</h2>
              <ol className="space-y-3 text-neutral-300">
                <li>
                  1. Obtén tu API key desde{' '}
                  <a href="https://platform.openai.com" className="text-accent-400 hover:underline">
                    platform.openai.com
                  </a>
                </li>
                <li>2. Ve a Configuración → Integraciones → Modelos LLM</li>
                <li>
                  3. Pega tu API key en el campo{' '}
                  <code className="text-accent-400">OPENAI_API_KEY</code>
                </li>
                <li>4. Selecciona el modelo por defecto (gpt-4-turbo recomendado)</li>
              </ol>
            </div>

            <div className="glass-panel p-6 rounded-xl">
              <h2 className="text-xl font-bold text-green-400 mb-4">Supabase</h2>
              <ol className="space-y-3 text-neutral-300">
                <li>
                  1. Crea un proyecto en{' '}
                  <a href="https://supabase.com" className="text-green-400 hover:underline">
                    supabase.com
                  </a>
                </li>
                <li>2. Copia la URL del proyecto y la anon key</li>
                <li>3. Ve a Configuración → Integraciones → Bases de Datos</li>
                <li>
                  4. Completa los campos <code className="text-green-400">SUPABASE_URL</code> y{' '}
                  <code className="text-green-400">SUPABASE_ANON_KEY</code>
                </li>
              </ol>
            </div>
          </div>
        )}

        {activeSection === 'api' && (
          <div className="max-w-4xl space-y-8 animate-fade-in">
            <div>
              <h1 className="text-3xl font-bold text-neutral-100 mb-4">📡 API Reference</h1>
              <p className="text-neutral-400 leading-relaxed">
                Documentación completa de la API REST y WebSocket
              </p>
            </div>

            <div className="glass-panel p-6 rounded-xl">
              <h2 className="text-xl font-bold text-accent-400 mb-4">REST Endpoints</h2>
              <div className="space-y-4">
                <div className="p-4 bg-base-900/40 rounded-lg border border-white/5">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="px-2 py-1 bg-green-500/10 text-green-400 text-xs font-bold rounded">
                      GET
                    </span>
                    <code className="text-accent-400">/api/status</code>
                  </div>
                  <p className="text-sm text-neutral-400">Obtiene el estado actual del sistema</p>
                </div>
                <div className="p-4 bg-base-900/40 rounded-lg border border-white/5">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="px-2 py-1 bg-blue-500/10 text-blue-400 text-xs font-bold rounded">
                      POST
                    </span>
                    <code className="text-accent-400">/api/agent/invoke</code>
                  </div>
                  <p className="text-sm text-neutral-400">Invoca un agente específico</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
