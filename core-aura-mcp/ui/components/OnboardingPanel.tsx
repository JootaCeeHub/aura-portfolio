import React from 'react';

interface Props {
  onAdd?: () => void;
}

export function OnboardingPanel({ onAdd }: Props) {
  return (
    <div className="card p-6">
      <div className="text-lg text-neutral-200 mb-2">Bienvenido al Cerebro de AURA</div>
      <p className="text-sm text-neutral-400 mb-4">
        No se encontraron MCPs conectados. AURA es un cerebro modular de IA que coordina múltiples
        MCPs distribuidos; cada MCP es un módulo cognitivo especializado, interoperable y
        autodocumentado.
      </p>
      <div className="text-sm text-neutral-300 mb-2">¿Qué puedes hacer ahora?</div>
      <ul className="list-disc list-inside text-sm text-neutral-400 mb-4">
        <li>Inicia un servidor MCP local y añádelo al registro.</li>
        <li>
          Configura el archivo <code>config/mcp-registry.json</code> con tus módulos.
        </li>
        <li>Conecta el Core con tu URL y Token.</li>
      </ul>
      <button className="btn" onClick={onAdd}>
        Añadir un MCP
      </button>
    </div>
  );
}
