import React from 'react'

export default function Onboarding() {
  return (
    <div className="bg-slate-900/30 p-6 rounded-lg border border-slate-800 text-center">
      <h3 className="text-lg font-semibold mb-2">No se encontraron MCPs</h3>
      <p className="text-slate-400 mb-4">Puedes registrar un MCP manualmente, iniciar uno local o conectar módulos remotos. Un MCP es un módulo cognitivo plug-and-play.</p>
      <div className="flex justify-center gap-3">
        <button className="px-4 py-2 bg-aura-500 text-black rounded font-semibold">Añadir un MCP</button>
        <button className="px-4 py-2 border border-slate-700 rounded text-slate-300">Iniciar servidor local</button>
      </div>
      <div className="mt-4 text-xs text-slate-500">Sugerencia: prueba <span className="italic">npx aura-mcp init</span> (genérico).</div>
    </div>
  )
}
