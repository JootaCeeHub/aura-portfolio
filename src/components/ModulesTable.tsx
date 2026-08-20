import React from 'react'

export default function ModulesTable() {
  // ejemplo estático
  const modules = [
    { name: 'Core-MCP', type: 'Core', status: 'OK', url: 'http://localhost:4000', desc: 'Orquestador central', activeSince: '2025-01-10', heartbeat: '2s' },
    { name: 'Tool-NLP', type: 'Tool-Server', status: 'WARNING', url: 'http://localhost:4001', desc: 'Procesamiento NLP', activeSince: '2025-02-01', heartbeat: '5s' }
  ]

  return (
    <div className="bg-slate-900/30 p-3 rounded-lg border border-slate-800 mt-4">
      <h4 className="text-sm font-semibold mb-2">Registro de MCPs</h4>
      <div className="text-xs text-slate-400 mb-2">Nombre · Tipo · Estado · Último heartbeat</div>
      <div className="space-y-2">
        {modules.map(m => (
          <div key={m.name} className="flex justify-between items-center bg-slate-900/50 p-2 rounded">
            <div>
              <div className="font-medium">{m.name} <span className="ml-2 text-xs text-slate-400">{m.type}</span></div>
              <div className="text-xs text-slate-400">{m.desc}</div>
            </div>
            <div className="text-right">
              <div className={`text-sm ${m.status === 'OK' ? 'text-green-300' : m.status === 'WARNING' ? 'text-yellow-300' : 'text-red-400'}`}>{m.status}</div>
              <div className="text-xs text-slate-400">{m.heartbeat}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
