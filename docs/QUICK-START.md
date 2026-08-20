# AURA Quick Start

## 1 minuto: "Hola Mundo"

```bash
# Crear proyecto
aura init my-aura-app
cd my-aura-app

# Iniciar dev server
npm run dev

# En otra terminal
curl http://localhost:3000/api/status
```

## 5 minutos: Tu Primer Agente

```bash
# Generar agente
aura generate:agent --name my_first_agent

# Ver archivo generado
cat agents/my_first_agent/my_first_agent.ts

# Ejecutar test
npm test agents/my_first_agent
```

## 15 minutos: Agente con Prompts

```typescript
// agents/my_assistant/my_assistant.ts
import { templateBuilder } from '@aura-mcp/core';

export async function initializeAssistant(): Promise<string> {
  return templateBuilder.buildFromTemplate('developer', undefined, {
    agentId: 'my_assistant',
    tools: ['code.analyze', 'docs.generate']
  });
}
```

## 30 minutos: Event-Driven Listener

```typescript
// agents/monitor/monitor.ts
import { eventBus } from '@aura-mcp/core';

export function setupMonitor(): void {
  eventBus.subscribe('AgentExecutionCompleted', (event) => {
    console.log(`✅ ${event.agentId} completó en ${event.latencyMs}ms`);
  });
}
```

## Recursos

- [Ejemplos](../examples/)
- [Documentación Completa](./index.md)
- [ADRs](./adr/)
- [API Reference](./api/)

## Problemas?

```bash
# Debug
aura dev --debug

# Logs
aura logs --level debug

# Health check
curl http://localhost:3000/api/status
```

¡Listo! 🚀
