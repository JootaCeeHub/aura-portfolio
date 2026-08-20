import React, { useState } from 'react'

export default function ConsolePanel() {
  const [messages, setMessages] = useState([{ id: 1, from: 'system', text: 'Esperando al Orquestador…' }])
  const [input, setInput] = useState('')

  function send() {
    if (!input.trim()) return
    setMessages(prev => [...prev, { id: Date.now(), from: 'user', text: input }])
    setInput('')
    // placeholder: aquí se llamaría al Core/Tool
  }

  return (
    <div className="bg-slate-900/30 p-4 rounded-lg border border-slate-800">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold">Consola Cognitiva AURA</h3>
        <div className="text-xs text-slate-400">Chat · Tool Calls · Autodescubrimiento</div>
      </div>

      <div className="h-48 overflow-auto bg-slate-900/60 p-3 rounded">
        {messages.map(m => (
          <div key={m.id} className={`mb-2 ${m.from === 'user' ? 'text-right' : 'text-left'}`}>
            <div className="inline-block px-3 py-1 rounded bg-slate-800 text-sm">{m.text}</div>
          </div>
        ))}
      </div>

      <div className="mt-3 flex gap-2">
        <input value={input} onChange={e => setInput(e.target.value)} placeholder="Escribe un comando o pregunta técnica..." className="flex-1 px-3 py-2 rounded bg-slate-800 border border-slate-700 text-sm" />
        <button onClick={send} className="px-4 py-2 bg-aura-500 rounded text-black font-semibold">Enviar</button>
      </div>
    </div>
  )
}
