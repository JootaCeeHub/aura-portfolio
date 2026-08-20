import React from 'react'

export default function CognitiveMap() {
  return (
    <div className="bg-slate-900/30 p-4 rounded-lg border border-slate-800 min-h-[240px]">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold">Mapa Cognitivo</h3>
        <div className="text-xs text-slate-400">Visualización: Force-Graph · Mermaid · JSON</div>
      </div>

      <div className="h-56 rounded bg-gradient-to-b from-transparent to-slate-900/50 border border-slate-800 flex items-center justify-center text-slate-400">
        <!-- Placeholder: renderer (Mermaid / Force Graph) -->
        <div className="text-center">
          <div className="mb-2">[ Renderizador de Grafo — Force / Mermaid ]</div>
          <div className="text-xs">Nodos: MCP-Core, Tool-Server, Data-Server, Flow-Server · Estado: activo/degradado/down</div>
        </div>
      </div>
    </div>
  )
}
