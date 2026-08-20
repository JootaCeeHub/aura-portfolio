# Guía: Crear tu Primer Agente

## Objetivo
Crear un agente LLM que analiza código y sugiere mejoras.

## Paso 1: Generar Scaffold

```bash
aura generate:agent --name code_analyzer --type llm
```

Esto crea:
```
agents/
  code_analyzer/
    code_analyzer.ts
    code_analyzer.test.ts
    agent.config.json
```

## Paso 2: Implementar Lógica

Edita `agents/code_analyzer/code_analyzer.ts`:

```typescript
import { templateBuilder } from '@aura-mcp/core';

export async function initializeCodeAnalyzer(): Promise<string> {
  // Usar template DEVELOPER con customización
  return templateBuilder.buildFromTemplate('developer', undefined, {
    agentId: 'code_analyzer',
    specialization: 'código Python y JavaScript',
    tools: ['code.analyze', 'suggestions.generate']
  });
}

export async function analyzeCode(code: string): Promise<{
  issues: string[];
  suggestions: string[];
  rating: number;
}> {
  // Lógica aquí
  return {
    issues: ['variable no usado'],
    suggestions: ['usar const en lugar de let'],
    rating: 7
  };
}
```

## Paso 3: Escribir Tests

Edita `agents/code_analyzer/code_analyzer.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { analyzeCode } from './code_analyzer';

describe('CodeAnalyzerAgent', () => {
  it('detecta variables no usadas', async () => {
    const result = await analyzeCode('let x = 5; let y = 10; console.log(x);');
    expect(result.issues).toContain('variable no usado');
  });

  it('sugiere mejoras de style', async () => {
    const result = await analyzeCode('var z = 100;');
    expect(result.suggestions.length).toBeGreaterThan(0);
  });
});
```

Ejecutar tests:
```bash
aura test:core code_analyzer
```

## Paso 4: Usar en Aplicación

```typescript
import { agentFactory } from '@aura-mcp/core';
import { initializeCodeAnalyzer, analyzeCode } from './agents/code_analyzer';

async function main() {
  // Registrar agente
  const prompt = await initializeCodeAnalyzer();
  console.log(prompt);

  // Usar agente
  const code = 'function hello() { return "world"; }';
  const analysis = await analyzeCode(code);
  console.log(analysis);
}

main();
```

## Paso 5: Debug

```bash
# Con HMR (hot reload)
aura dev

# Con breakpoints
aura debug

# Inspeccionar en Devtools
http://localhost:9999
```

## Tips

✅ **DO**:
- Usar templates predefinidos como base
- Escribir tests para cada agente
- Usar slots para dinamismo
- Documentar en comments

❌ **DON'T**:
- Hardcodear prompts (usar templateBuilder)
- Ignorar edge cases
- Crear agentes monolíticos
- Saltarse validación

## Next Steps

- [Advanced Agentes](./GUIDE-ADVANCED.md)
- [Event-Driven Agents](./EVENT-DRIVEN.md)
- [Deploy a Producción](./KUBERNETES.md)
