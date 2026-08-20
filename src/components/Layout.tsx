import React from 'react'

const Header = () => (
  <header className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-md bg-gradient-to-br from-aura-500 to-aura-700 flex items-center justify-center font-bold">A</div>
      <div>
        <h1 className="text-lg font-semibold">AURA MCP — Cerebro</h1>
        <p className="text-xs text-slate-400">Orquestador Multi-Agente · Sistema Cognitivo Maestro</p>
      </div>
    </div>
    <div className="text-sm text-slate-400">Estado: <span className="ml-2 text-green-400">Conectado</span></div>
  </header>
)

const Sidebar = () => (
  <aside className="w-64 bg-transparent border-r border-slate-800 p-4 hidden lg:block">
    <nav className="space-y-2">
      <button className="w-full text-left px-3 py-2 rounded hover:bg-slate-800">Dashboard</button>
      <button className="w-full text-left px-3 py-2 rounded hover:bg-slate-800">Mapa Cognitivo</button>
      <button className="w-full text-left px-3 py-2 rounded hover:bg-slate-800">Consola</button>
      <button className="w-full text-left px-3 py-2 rounded hover:bg-slate-800">Logs & Diagnosis</button>
      <button className="w-full text-left px-3 py-2 rounded hover:bg-slate-800">Configuración</button>
    </nav>
  </aside>
)

const Footer = () => (
  <footer className="px-6 py-3 border-t border-slate-800 text-xs text-slate-500">
    AURA · MCP Orquestador — © {new Date().getFullYear()}
  </footer>
)

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <div className="flex-1 overflow-auto bg-transparent">
          {children}
          <Footer />
        </div>
      </div>
    </div>
  )
}
