import React from 'react'

export default function LogsPanel() {
  // placeholder para filtros y timeline interactivo
  return (
    <div className="bg-slate-900/30 p-4 rounded-lg border border-slate-800 h-[520px]">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold">Logs y Diagnóstico</h4>
        <div className="text-xs text-slate-400">Filtros · Correlation IDs · Export</div>
      </div>

      <div className="flex gap-2 mb-3">
        <select className="bg-slate-800 px-2 py-1 text-sm rounded">
          <option>All</option>
          <option>error</option>
          <option>warn</option>
          <option>info</option>
          <option>tool-call</option>
        </select>
        <input placeholder="Correlation ID" className="bg-slate-800 px-2 py-1 text-sm rounded flex-1" />
        <button className="px-3 py-1 bg-slate-700 rounded">Export JSON</button>
      </div>

      <div className="overflow-auto bg-slate-900/60 p-2 rounded h-[420px] text-xs">
        <div className="mb-2 text-slate-400">[Timeline interactivo — arrastrar para filtrar]</div>
        <div className="space-y-2">
          <div className="flex justify-between">
            <div>[2025-11-10 12:05:10] Core-MCP - info - Heartbeat received (id: abc123)</div>
            <div className="text-slate-400">core</div>
          </div>
          <div className="flex justify-between text-yellow-300">
            <div>[2025-11-10 12:04:52] Tool-NLP - warn - Latency spike (2000ms)</div>
            <div className="text-slate-400">tool-call</div>
          </div>
          <div className="flex justify-between text-red-400">
            <div>[2025-11-10 12:03:01] Data-Server - error - Connection refused</div>
            <div className="text-slate-400">data</div>
          </div>
        </div>
      </div>
    </div>
  )
}
