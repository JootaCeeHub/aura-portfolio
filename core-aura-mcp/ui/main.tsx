import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { NavBar } from './components/NavBar';
import { SideBar } from './components/SideBar';
import { StatusCard } from './components/StatusCard';
import { HeartbeatPanel } from './components/HeartbeatPanel';
import { CognitiveConsole } from './components/CognitiveConsole';
import { CognitiveMap } from './components/CognitiveMap';
import { OnboardingPanel } from './components/OnboardingPanel';
import { SuggestBanner, type Suggestion } from './components/SuggestBanner';
import { DiagnosticsPanel } from './components/DiagnosticsPanel';
import { ConfigPanel } from './components/ConfigPanel';
import { WelcomePage } from './components/WelcomePage';
import { DocumentationPanel } from './components/DocumentationPanel';
// import ConsoleContainer from './components/containers/ConsoleContainer';
import {
  McpCoreClient,
  configureCoreClient,
  type CoreStatus,
  type McpModuleInfo,
} from './services/mcpCoreClient';
import DashboardPanel from './components/DashboardPanel';
import { McpModuleTable } from './components/McpModuleTable';
import { LogsTimeline } from './components/LogsTimeline';
import type { SectionId } from './components/types';

// Define LogItem locally if not exported, or rely on McpCoreClient update
export type LogItem = { id: string; ts: number; level: 'info' | 'warn' | 'error' | 'tool'; message: string };

function App() {
  const [url, setUrl] = useState<string>('http://localhost:3000');
  const [token] = useState<string>(import.meta.env.VITE_MCP_CORE_TOKEN || '');
  const [status, setStatus] = useState<CoreStatus | null>(null);
  const [modules, setModules] = useState<McpModuleInfo[]>([]);
  const [error, setError] = useState<string>('');
  const [errorDetails, setErrorDetails] = useState<any>(null);
  const [showErrorDetails, setShowErrorDetails] = useState(false);
  const [section, setSection] = useState<SectionId>('dashboard');
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showWelcome, setShowWelcome] = useState(true);

  const apply = async (targetUrl?: string | any, targetToken?: string) => {
    const useUrl = typeof targetUrl === 'string' ? targetUrl : url;
    const useToken = targetToken !== undefined ? targetToken : token;

    setError('');
    configureCoreClient({ url: useUrl, token: useToken });
    try {
      const s = await McpCoreClient.getStatus();
      setStatus(s);
      const list = await McpCoreClient.listServers();
      setModules(list || []);
      setLogs((prev) => [
        ...prev,
        { id: String(Date.now()), ts: Date.now(), level: 'info', message: 'Conectado al Core' },
      ]);
      const sug: Suggestion[] = [];
      if (!list || list.length === 0) {
        sug.push({
          id: 'add-mcp',
          message: 'No hay MCPs conectados. ¿Quieres añadir uno?',
          actionLabel: 'Añadir MCP',
        });
      }
      setSuggestions(sug);
    } catch (e: any) {
      setError(e?.message || String(e));
      setErrorDetails(e);
      // Detailed error object for inspection
      const detailed = {
        message: e.message,
        name: e.name,
        code: e.code,
        stack: e.stack,
        config: e.config
          ? { url: e.config.url, method: e.config.method, headers: e.config.headers }
          : undefined,
        response: e.response
          ? { status: e.response.status, statusText: e.response.statusText, data: e.response.data }
          : undefined,
      };

      // If it's a 401, we might want to hint about the token
      if (e.response?.status === 401) {
        detailed.message = `${e.message} - Posible problema de Token/Auth`;
      }

      setErrorDetails(detailed);
    }
  };

  useEffect(() => {
    const init = async () => {
      let configUrl = url;
      try {
        const res = await fetch('/server-config.json');
        if (res.ok) {
          const config = await res.json();
          if (config.url) {
            configUrl = config.url;
            setUrl(configUrl);
          }
        }
      } catch {
        console.warn('Could not load server config, using default');
      }
      // Auto-connect on mount
      apply(configUrl);
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onLog = (l: LogItem) => setLogs((prev) => [...prev, l]);

  const handleEnterApp = () => {
    setShowWelcome(false);
  };

  const handleNavigateToDocs = () => {
    setShowWelcome(false);
    setSection('docs');
  };

  if (showWelcome) {
    return <WelcomePage onEnter={handleEnterApp} onNavigateToDocs={handleNavigateToDocs} />;
  }

  return (
    <div className="min-h-screen bg-base-950 text-neutral-100">
      <NavBar connected={!!status?.ok} url={url} latencyMs={undefined} env={import.meta.env.MODE} />
      <div className="flex h-[calc(100vh-4rem)]">
        <SideBar section={section} onSectionChange={setSection} />
        <div className="flex-1 overflow-auto p-6 space-y-6">
          {/* Connection error display if needed */}
          {error && (
            <div className="p-4 mb-4 rounded-lg bg-red-950/40 border border-red-500/30 text-red-200 text-sm shadow-sm">
              <div className="flex items-center gap-3">
                <span className="text-xl">⚠️</span>
                <span className="font-medium">Error de conexión: {error}</span>
                <div className="ml-auto flex items-center gap-2">
                  <button
                    className="btn btn-xs btn-ghost text-red-300 hover:bg-red-900/40"
                    onClick={() => setShowErrorDetails(!showErrorDetails)}
                  >
                    {showErrorDetails ? 'Ocultar Detalles' : 'Ver Detalles'}
                  </button>
                  <button
                    className="btn btn-xs btn-outline border-red-500/50 text-red-300 hover:bg-red-900/60"
                    onClick={() => apply()}
                  >
                    Reintentar
                  </button>
                </div>
              </div>
              {showErrorDetails && errorDetails && (
                <div className="mt-3 p-3 bg-black/40 rounded border border-white/5 text-xs font-mono overflow-auto max-h-60 whitespace-pre-wrap text-red-300/80">
                  {JSON.stringify(errorDetails, null, 2)}
                </div>
              )}
            </div>
          )}

          {section === 'dashboard' && <DashboardPanel status={status} modules={modules} />}

          {section === 'home' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2 space-y-4">
                {modules.length === 0 ? (
                  <OnboardingPanel onAdd={() => setSection('modules')} />
                ) : (
                  <div className="card p-4">
                    <div className="title-sm mb-2">Módulos MCP</div>
                    <McpModuleTable modules={modules} />
                  </div>
                )}
                <HeartbeatPanel url={url} token={token} />
              </div>
              <div className="space-y-4">
                <StatusCard
                  title="Servicios"
                  items={[
                    { name: 'openai', status: status?.ok ? 'WARN' : 'DOWN' },
                    { name: 'n8n', status: 'WARN' },
                    { name: 'supabase', status: 'WARN' },
                  ]}
                />
                <DiagnosticsPanel status={status} />
                <SuggestBanner
                  suggestions={suggestions}
                  onAction={(id) => {
                    if (id === 'add-mcp') setSection('modules');
                  }}
                />
                <LogsTimeline
                  logs={logs}
                  onExport={(items) => {
                    const blob = new Blob([JSON.stringify(items, null, 2)], {
                      type: 'application/json',
                    });
                    const a = document.createElement('a');
                    a.href = URL.createObjectURL(blob);
                    a.download = 'logs.json';
                    a.click();
                  }}
                />
              </div>
            </div>
          )}

          {section === 'map' && (
            <CognitiveMap
              nodes={[
                { id: 'core', label: 'AURA Core', status: status?.ok ? 'OK' : 'DOWN' },
                ...modules.map((m) => ({ id: m.name, label: m.name, status: 'OK' as const })),
              ]}
              edges={modules.map((m) => ({ from: 'AURA Core', to: m.name }))}
            />
          )}

          {section === 'console' && <CognitiveConsole onLog={onLog} />}

          {section === 'modules' && (
            <div className="card p-4">
              <div className="title-sm mb-2">Registro de MCP Modules</div>
              <McpModuleTable modules={modules} />
            </div>
          )}

          {section === 'logs' && (
            <LogsTimeline
              logs={logs}
              onExport={(items) => {
                const blob = new Blob([JSON.stringify(items, null, 2)], {
                  type: 'application/json',
                });
                const a = document.createElement('a');
                a.href = URL.createObjectURL(blob);
                a.download = 'logs.json';
                a.click();
              }}
            />
          )}

          {section === 'settings' && (
            <div className="w-full">
              <ConfigPanel />
            </div>
          )}

          {section === 'docs' && <DocumentationPanel />}
        </div>
      </div>
    </div>
  );
}

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
