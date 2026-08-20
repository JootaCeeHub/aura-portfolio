import React from 'react'

export default function CorePanel() {
  return (
    <div className="bg-slate-900/40 p-4 rounded-lg border border-slate-800">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold">Core MCP</h2>
          <p className="text-xs text-slate-400">Sistema Cognitivo Maestro · Orquestador</p>
        </div>
        <div className="text-right">
          <div className="text-xs text-slate-400">Conexión</div>
          <div className="text-sm text-green-400">Online</div>
        </div>
      </div>

      <div className="mt-4 text-sm space-y-2">
        <div className="flex justify-between">
          <span className="text-slate-400">Heartbeats</span>
          <span className="text-green-300">5/s</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">MCPs detectados</span>
          <span className="text-aura-100">3</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">Orquestador</span>
          <span className="text-yellow-300">Operativo (modo híbrido)</span>
        </div>
      </div>

      <div className="mt-4 text-xs text-slate-400">
        <strong>Ultimo log:</strong> Autodiagnóstico: topología estable. <button className="ml-2 underline">Ver detalles</button>
      </div>
    </div>
  )
}