# Integración: Panel de Configuración con Sistema de Agentes

## Visión General

El Panel de Configuración **actualiza dinámicamente** el sistema de agentes AURA. Cuando se modifica la configuración, los agentes pueden recargar su contexto sin reiniciar.

## Flujo de Integración

```
Panel de Configuración
    ↓
    PUT /api/config (guarda + snapshot)
    ↓
ConfigService.save() crea evento
    ↓
Event: 'config-updated'
    ↓
AgentManager escucha evento
    ↓
reload() → cada agente carga nueva configuración
```

## Implementación

### 1. Emitir Evento desde ConfigService

En `core/configService.ts`, después de guardar:

```typescript
import { EventEmitter } from 'events';

export const configEvents = new EventEmitter();

export class ConfigService {
  async save(config: AuraConfig, user: string): Promise<void> {
    // ... guardar lógica
    
    // Emitir evento para agentes
    configEvents.emit('config-updated', {
      config,
      changedBy: user,
      timestamp: new Date().toISOString()
    });
  }
}
```

### 2. Escuchar en AgentManager

En `agents/core/agentManager.ts`:

```typescript
import { configEvents } from '../../services/configService';

export class AgentManager {
  constructor() {
    // Escuchar cambios de configuración
    configEvents.on('config-updated', async (event) => {
      Logger.info('Config updated, reloading agents', event);
      await this.reloadAllAgents();
    });
  }

  async reloadAllAgents(): Promise<void> {
    const agents = this.registry.getAllAgents();
    
    for (const agent of agents) {
      try {
        // Recargar contexto del agente
        const newContext = await this.buildAgentContext(agent.name);
        agent.context = newContext;
        Logger.info(`Agent ${agent.name} reloaded`);
      } catch (error) {
        Logger.error(`Failed to reload agent ${agent.name}:`, error);
      }
    }
  }

  private async buildAgentContext(name: string): Promise<AgentContext> {
    const config = await configService.getConfig();
    
    return {
      agentIdentity: {
        name: config.agent.name,
        role: config.agent.role,
        enabled: config.agent.enabled
      },
      coreSettings: config.core,
      repositories: config.repositories
    };
  }
}
```

### 3. Actualizar Prompt del Agente

Cuando se carga nueva configuración, el systemPrompt debe actualizarse:

```typescript
export async function rebuildAgentPrompt(agentName: string): Promise<string> {
  const config = await configService.getConfig();
  const templateBuilder = new AgentTemplateBuilder();
  
  // Usar AgentTemplateBuilder para construir prompt dinámico
  const systemPrompt = templateBuilder.buildFromTemplate(
    agentName,
    undefined, // usa baseRules del template
    {
      agentName: config.agent.name,
      agentRole: config.agent.role,
      corePort: config.core.port,
      repositories: config.repositories
    }
  );
  
  return systemPrompt;
}
```

## Casos de Uso

### Caso 1: Cambiar Nombre/Role del Agente

**En Panel:**
1. Navega a Configuración → Identidad del Agente
2. Cambia "name" a "AURA v2 Orchestrator"
3. Cambiar "role" a "Gestor Cognitivo Avanzado"
4. Click en "Guardar" → Preview ✓
5. Backend emite evento `config-updated`

**En Agentes:**
- `configEvents` dispara listener
- `AgentManager.reloadAllAgents()` se ejecuta
- Cada agente obtiene nuevo nombre/role
- Sus systemPrompts se actualizan automáticamente
- Sin reiniciar el servidor

### Caso 2: Actualizar Rutas de Repositorio

**En Panel:**
1. Configuración → Repositorios
2. Cambiar `promptsPath` a `src/repository/prompts-v2`
3. Guardar

**En Agentes:**
- AgentManager recibe evento
- Recompila agentes con nuevas rutas
- Próximas búsquedas de prompts usan v2
- Snapshot automático guardado

### Caso 3: Cambiar Nivel de Log

**En Panel:**
1. Configuración → Core → logLevel
2. Cambiar a "error" (menos verboso)
3. Guardar

**En Sistema:**
- Evento disparado
- Logger global recibe nueva configuración
- Output de logs reduce inmediatamente

## API del Evento

```typescript
interface ConfigUpdatedEvent {
  config: AuraConfig;           // Configuración completa nueva
  changedBy: string;            // Usuario que hizo cambio
  timestamp: string;            // ISO 8601 timestamp
}

configEvents.on('config-updated', (event: ConfigUpdatedEvent) => {
  // Reaccionar a cambios
});
```

## Estructura de Datos

### ConfigContext Inyectado en Agentes

```typescript
interface AgentContext {
  agentIdentity: {
    name: string;               // "AURA Orchestrator"
    role: string;               // "Orquestador Cognitivo"
    enabled: boolean;           // true/false
  };
  coreSettings: {
    host: string;
    port: number;
    enableWs: boolean;
    logLevel: 'debug' | 'info' | 'warn' | 'error';
  };
  repositories: {
    promptsPath: string;
    templatesPath: string;
    formsPath: string;
    knowledgePath: string;
  };
}
```

## Testing de Integración

```typescript
// tests/integration/configAgent.integration.test.ts
import { describe, it, expect, vi } from 'vitest';
import { configEvents, configService } from '../../core/configService';
import { agentManager } from '../../agents/core/agentManager';

describe('Config + Agent Integration', () => {
  it('should reload agents when config updates', async () => {
    const reloadSpy = vi.spyOn(agentManager, 'reloadAllAgents');
    
    // Simular actualización de config
    const testConfig = { ...defaultConfig, agent: { name: 'New Name' } };
    await configService.save(testConfig, 'test-user');
    
    expect(reloadSpy).toHaveBeenCalled();
  });

  it('should update agent context with new values', async () => {
    const newConfig = { ...defaultConfig, core: { port: 4000 } };
    await configService.save(newConfig, 'test-user');
    
    const orchestrator = agentManager.getAgent('orchestrator');
    expect(orchestrator.context.coreSettings.port).toBe(4000);
  });
});
```

## Ventajas

| Aspecto | Beneficio |
|--------|-----------|
| **Sin Downtime** | Los agentes se actualizan en tiempo real, sin reiniciar |
| **Consistencia** | Todos los agentes leen la misma configuración atomically |
| **Auditoría** | Snapshots registran quién cambió qué y cuándo |
| **Rollback** | Restaurar config anterior revertirá comportamiento de agentes |
| **Escalabilidad** | Multi-instancia: eventos pueden cruzar servicios con Redis |

## Escalamiento: Múltiples Instancias

Para despliegue distribuido (varias instancias del core), usa Redis para pub/sub:

```typescript
import Redis from 'ioredis';

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379
});

configEvents.on('config-updated', async (event) => {
  // Publicar a todas las instancias
  await redis.publish('aura:config-updated', JSON.stringify(event));
});

// Escuchar actualizaciones de otras instancias
redis.subscribe('aura:config-updated', (err, count) => {
  if (err) console.error('Failed to subscribe:', err);
  else console.log(`Subscribed to ${count} channels`);
});

redis.on('message', (channel, message) => {
  if (channel === 'aura:config-updated') {
    const event = JSON.parse(message);
    agentManager.reloadAllAgents(event);
  }
});
```

## Próximos Pasos

1. **Implementar evento en ConfigService**: Agregar `configEvents.emit()` al método `save()`
2. **Listener en AgentManager**: Implementar `reloadAllAgents()` y `buildAgentContext()`
3. **Tests de integración**: Validar flujo completo config → evento → agentes
4. **Redis pub/sub (opcional)**: Para multi-instancia
5. **Documentación en UI**: Mostrar en Panel que agentes están "listening" para cambios

## Referencias

- [agentManager.ts](../../agents/core/agentManager.ts)
- [configService.ts](../../src/services/configService.ts)
- [AgentTemplateBuilder](../../core/agentTemplateBuilder.ts)
- [AGENTS.md](../../AGENTS.md)

---

**Diseño actualizado:** 13 de diciembre de 2025
