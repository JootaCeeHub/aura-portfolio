# Arquitectura: Panel de Configuración AURA

## 📐 Diagrama General

```
┌─────────────────────────────────────────────────────────────────┐
│                    USUARIO FINAL (Navegador)                     │
└─────────────────────────────────────────────────────────────────┘
                              ↓
                        ┌─────────────┐
                        │   Vite UI   │
                        │  :5678      │
                        └─────────────┘
                              ↓
                    ┌──────────┴──────────┐
                    ↓                     ↓
         ┌────────────────────┐  ┌─────────────────┐
         │ ConfigPage.tsx     │  │ ConfigForm.tsx  │
         │ (State Mgmt)       │  │ (react-hook-    │
         │                    │  │  form wrapper)  │
         └────────────────────┘  └─────────────────┘
                    ↓                     ↓
         ┌─────────────────────────────────────────┐
         │         formUtils.tsx (Shared)          │
         │  • renderFieldError()                   │
         │  • renderPathHelper()                   │
         │  • sectionStyles                        │
         └─────────────────────────────────────────┘
                    ↓
         ┌──────────┬──────────┬──────────┐
         ↓          ↓          ↓          ↓
    ┌─────────┐ ┌────────┐ ┌──────────┐  │
    │ Agent   │ │  Core  │ │Repository│  │
    │ Section │ │ Section│ │ Section  │  │
    └─────────┘ └────────┘ └──────────┘  │
         ↓          ↓          ↓          ↓
         └──────────┴──────────┴──────────┘
                    ↓
         ┌──────────────────────┐
         │   configApi.ts       │
         │  (HTTP Client)       │
         └──────────────────────┘
                    ↓ HTTP
                    ↓
┌─────────────────────────────────────────────────────────────────┐
│                  Express Server (Node.js)                        │
│                        :3000                                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │        API Routes: /api/config/*                        │  │
│  │  • GET    /api/config                                   │  │
│  │  • PUT    /api/config                                   │  │
│  │  • POST   /api/config/preview    (validate only)       │  │
│  │  • GET    /api/config/history    (list snapshots)      │  │
│  │  • POST   /api/config/restore    (restore snapshot)    │  │
│  └──────────────────────────────────────────────────────────┘  │
│           ↓            ↓              ↓            ↓            │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              ConfigService (Persistence)                │  │
│  │  • load()          - Read config.json                   │  │
│  │  • save()          - Write + snapshot                   │  │
│  │  • getConfig()     - Get in-memory config               │  │
│  │  • createSnapshot()- Archive version                    │  │
│  │  • listSnapshots() - List all archives                  │  │
│  │  • restore()       - Restore archived version           │  │
│  └──────────────────────────────────────────────────────────┘  │
│           ↓                           ↓                          │
│  ┌──────────────────────┐   ┌──────────────────────────┐        │
│  │      Ajv             │   │  File System             │        │
│  │  JSON Schema         │   │  config.json             │        │
│  │  Validator           │   │  config/backups/*        │        │
│  │                      │   │                          │        │
│  │ Validates:           │   │ Stores:                  │        │
│  │ • Required fields    │   │ • Current config         │        │
│  │ • Type checking      │   │ • Snapshots (UUID named) │        │
│  │ • Port range (1024+) │   │ • Metadata per snapshot  │        │
│  │ • String lengths     │   │                          │        │
│  └──────────────────────┘   └──────────────────────────┘        │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Flujo de Datos: Guardar Configuración

```
┌─────────────────────────────────────────────────────────────────┐
│  1. Usuario edita formulario en UI                              │
│     ConfigPage.tsx recibe cambios                               │
└─────────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│  2. Valida localmente con react-hook-form                       │
│     • Campos requeridos                                         │
│     • Rangos (port 1024-65535)                                 │
│     • Tipos (number, boolean, string)                          │
└─────────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│  3. Envía PUT /api/config con payload                           │
│     configApi.ts → HTTP Request                                │
│     Content-Type: application/json                             │
└─────────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│  4. Servidor recibe en config.ts (router)                       │
│     • Middleware CORS ✓                                        │
│     • Body parser JSON ✓                                       │
└─────────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│  5. Valida contra JSON Schema (Ajv)                             │
│     const isValid = ajv.validate(schema, config)               │
│     → Si inválido: retorna errores normalizados                │
│     → Si válido: continúa                                       │
└─────────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│  6. ConfigService.save() se ejecuta                             │
│     • ANTES de guardar: createSnapshot() genera backup         │
│       - UUID único para snapshot                               │
│       - Metadatos: timestamp, usuario                          │
│       - Archivo en config/backups/[uuid].json                  │
└─────────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│  7. Escribe config.json (new version)                           │
│     fs.writeFileSync(CONFIG_PATH, JSON.stringify(config))      │
└─────────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│  8. Emite evento 'config-updated' (futuro)                      │
│     configEvents.emit('config-updated', {...})                │
│     → AgentManager escucha                                      │
│     → Agentes se recargan con nueva config                     │
└─────────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│  9. Retorna 200 OK con metadata                                 │
│     { success: true, config: {...}, snapshot: uuid }           │
└─────────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│  10. UI muestra confirmación                                    │
│      ConfigPage actualiza estado                               │
│      Usuario ve "✓ Guardado exitosamente"                      │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔍 Flujo: Preview (Validación sin Guardar)

```
┌─────────────────────────────────────────────────────────────────┐
│  Usuario: Click "Preview"                                       │
└─────────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│  POST /api/config/preview (payload)                             │
│  • No valida localmente                                         │
│  • Envía tal cual al servidor                                  │
└─────────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│  Servidor: validateWithNormalization()                          │
│  1. Ajv.validate(schema, config)                               │
│  2. Si hay errores: normaliza a formato field-level            │
│                                                                 │
│  Antes (Ajv raw):                                              │
│  [ { instancePath: '/core/port', message: 'must be >= 1024' }] │
│                                                                 │
│  Después (normalizado):                                         │
│  { '/core/port': ['minimum: must be >= 1024'] }               │
└─────────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│  Retorna JSON:                                                  │
│  {                                                              │
│    "valid": false,                                             │
│    "errors": {                                                 │
│      "/agent/name": ["required"],                              │
│      "/core/port": ["minimum: must be >= 1024"]               │
│    }                                                            │
│  }                                                              │
└─────────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│  UI: Muestra errores en cada campo                              │
│  • agent.name: "Este campo es requerido" (en rojo)             │
│  • core.port: "El puerto debe ser >= 1024"                     │
│  → No permite guardar hasta que preview retorne valid: true     │
└─────────────────────────────────────────────────────────────────┘
```

---

## 💾 Flujo: Snapshots y Restauración

```
┌──────────────────────────────────────────────────────────────────┐
│  Estado Actual: config.json v1                                   │
│  { agent: { name: "AURA Orchestrator" }, ... }                 │
└──────────────────────────────────────────────────────────────────┘
                           ↓
┌──────────────────────────────────────────────────────────────────┐
│  Usuario realiza cambio: name → "AURA v2"                        │
│  Click "Guardar"                                                │
└──────────────────────────────────────────────────────────────────┘
                           ↓
┌──────────────────────────────────────────────────────────────────┐
│  configService.save() ANTES de escribir:                         │
│  1. createSnapshot() se ejecuta                                 │
│  2. Genera UUID único: "f47ac10b-58cc-4372-a567-0e02b2c3d479"  │
│  3. Archivo: config/backups/f47ac10b-58cc-4372-a567-0e02b2c3d479.json │
│  4. Contenido:                                                  │
│     {                                                           │
│       "meta": {                                                │
│         "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",          │
│         "createdAt": "2025-12-13T10:30:45Z",                   │
│         "createdBy": "admin@aura.local"                        │
│       },                                                        │
│       "config": { ...configuración anterior... }               │
│     }                                                           │
└──────────────────────────────────────────────────────────────────┘
                           ↓
┌──────────────────────────────────────────────────────────────────┐
│  Ahora sí se guarda:                                             │
│  config.json se sobrescribe con nueva versión (name = "AURA v2")│
└──────────────────────────────────────────────────────────────────┘
                           ↓
┌──────────────────────────────────────────────────────────────────┐
│  Archivos en disco:                                              │
│  config/                                                        │
│  ├── config.json                                               │
│  │   └── name: "AURA v2" (actual)                             │
│  └── backups/                                                  │
│      ├── f47ac10b.json (snapshot v1)                           │
│      ├── a1b2c3d4.json (snapshot anterior)                    │
│      └── ...más snapshots...                                   │
└──────────────────────────────────────────────────────────────────┘
                           ↓
┌──────────────────────────────────────────────────────────────────┐
│  Usuario se arrepiente: Click "Historial"                        │
│  Modal muestra lista de snapshots:                              │
│  • f47ac10b (5 min ago) - admin - "AURA v1"                    │
│  • a1b2c3d4 (1 hour ago) - system                              │
│  • ...                                                          │
└──────────────────────────────────────────────────────────────────┘
                           ↓
┌──────────────────────────────────────────────────────────────────┐
│  Click "Restaurar" en f47ac10b                                   │
│  POST /api/config/restore { file: 'f47ac10b.json' }             │
└──────────────────────────────────────────────────────────────────┘
                           ↓
┌──────────────────────────────────────────────────────────────────┤
│  Servidor:                                                      │
│  1. Lee f47ac10b.json                                           │
│  2. Extrae config: { agent: { name: "AURA Orchestrator" }, ...} │
│  3. ANTES de escribir: crea OTRO snapshot del estado actual     │
│     (nuevo snapshot de "AURA v2" para auditoría)               │
│  4. Sobrescribe config.json con contenido restaurado           │
│  5. Retorna: { success: true, restored: 'f47ac10b.json' }      │
└──────────────────────────────────────────────────────────────────┘
                           ↓
┌──────────────────────────────────────────────────────────────────┐
│  Resultado:                                                     │
│  config.json → name: "AURA Orchestrator" (restaurado)           │
│  backups/ → +1 nuevo snapshot de "AURA v2"                     │
│                                                                │
│  Auditoría completa: puedes ver todo el historial              │
└──────────────────────────────────────────────────────────────────┘
```

---

## 🏗️ Arquitectura de Componentes React

```
ConfigPage (Container)
├── State:
│   ├── config: AuraConfig
│   ├── previewResult: { valid, errors }
│   ├── history: Snapshot[]
│   └── showHistory: boolean
│
├── ConfigForm (Child)
│   ├── useForm() - react-hook-form
│   ├── Props:
│   │   ├── config (initial values)
│   │   ├── previewErrors (from API)
│   │   └── onSubmit (handler)
│   │
│   ├── AgentSection (Grandchild)
│   │   ├── Fields:
│   │   │   ├── agent.name (text)
│   │   │   ├── agent.role (text)
│   │   │   └── agent.enabled (toggle)
│   │   └── Imports from: formUtils.tsx
│   │
│   ├── CoreSection (Grandchild)
│   │   ├── Fields:
│   │   │   ├── core.host (text)
│   │   │   ├── core.port (number)
│   │   │   ├── core.enableWs (toggle)
│   │   │   └── core.logLevel (select)
│   │   └── Imports from: formUtils.tsx
│   │
│   └── RepositoriesSection (Grandchild)
│       ├── Fields:
│       │   ├── repositories.promptsPath (text)
│       │   ├── repositories.templatesPath (text)
│       │   ├── repositories.formsPath (text)
│       │   └── repositories.knowledgePath (text)
│       └── Imports from: formUtils.tsx
│
└── History Modal (Sibling)
    ├── List de snapshots
    ├── Button "Restaurar"
    └── Button "Cerrar"

formUtils.tsx (Shared Utilities)
├── renderFieldError(path, errors) → JSX
├── renderPathHelper(hint) → JSX
└── sectionStyles: { container, grid2Col, grid1Col }
```

---

## 🐳 Arquitectura Docker

```
docker-compose.yml
│
├── Service: postgres
│   ├── Image: postgres:15
│   ├── Port: 5432 (internal)
│   ├── Health: pg_isready
│   └── Volume: postgres_data (persistent)
│
├── Service: redis
│   ├── Image: redis:7
│   ├── Port: 6379 (internal)
│   ├── Health: redis-cli ping
│   └── TTL: 300 (no persistence needed)
│
├── Service: core
│   ├── Build: ./core-aura-mcp
│   ├── Port: 3000 → external
│   ├── Depends: postgres (healthy), redis (healthy)
│   ├── Env Vars:
│   │   ├── AURA_CONFIG_PATH=/app/config/config.json
│   │   ├── AURA_CONFIG_SNAPSHOTS=/app/config/backups
│   │   ├── DATABASE_URL=postgres://...
│   │   └── REDIS_URL=redis://redis:6379
│   ├── Volumes:
│   │   ├── ./core-aura-mcp/src:/app/src (hot-reload)
│   │   ├── ./core-aura-mcp/config:/app/config (persist)
│   │   └── ./core-aura-mcp/logs:/app/logs (logs)
│   └── Network: aura-network
│
├── Service: ui
│   ├── Build: ./core-aura-mcp/ui
│   ├── Port: 5678 → external
│   ├── Depends: core (running, no health check)
│   ├── Env Vars:
│   │   └── VITE_AURA_CORE_URL=http://core:3000
│   ├── Volumes:
│   │   └── ./core-aura-mcp/ui/src:/app/src (hot-reload)
│   └── Network: aura-network
│
└── Network: aura-network (bridge)
    └── Services conectados: postgres, redis, core, ui

Volumes:
├── postgres_data (named volume)
├── ./config (bind mount - config persistence)
└── ./src (bind mounts x2 - hot reload)
```

---

## 📋 Estructura de Datos

### config.json
```json
{
  "meta": {
    "version": "1.0.0",
    "lastChangedBy": "admin@aura.local",
    "lastChangedAt": "2025-12-13T10:30:45Z"
  },
  "agent": {
    "name": "AURA Orchestrator",
    "role": "Orquestador Cognitivo",
    "enabled": true
  },
  "core": {
    "host": "localhost",
    "port": 3000,
    "enableWs": true,
    "logLevel": "debug"
  },
  "repositories": {
    "promptsPath": "src/repository/prompts",
    "templatesPath": "src/repository/templates",
    "formsPath": "src/repository/forms",
    "knowledgePath": "src/repository/knowledge"
  }
}
```

### Snapshot: config/backups/[uuid].json
```json
{
  "meta": {
    "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "createdAt": "2025-12-13T10:30:45Z",
    "createdBy": "admin@aura.local"
  },
  "config": { /* same structure as config.json */ }
}
```

---

## 🔗 Integración: Agentes + Configuración (Futuro)

```
ConfigService (Backend)
    └── emit('config-updated', event)
        └── event = { config, changedBy, timestamp }
            └── AgentManager.reloadAllAgents()
                ├── Orchestrator Agent
                │   ├── Load: config.agent.name → prompt
                │   ├── Load: config.core.port → connection
                │   └── Load: config.repositories → paths
                │
                ├── Developer Agent
                │   └── Load: config.repositories.templatesPath
                │
                ├── Trading Agent
                │   └── Load: config.repositories.knowledgePath
                │
                └── Analyst Agent
                    └── Load: all repositories for data access
```

---

## 📦 Stack Tecnológico

| Capa | Tecnología | Versión | Propósito |
|------|-----------|---------|----------|
| **Frontend** | React | 18.2.0 | UI |
| **Forms** | react-hook-form | 7.48.0 | State management |
| **Bundler** | Vite | - | Dev server + build |
| **Backend** | Express.js | - | HTTP server |
| **Validation** | Ajv | 8.12.0 | JSON Schema |
| **Database** | PostgreSQL | 15 | (future) |
| **Cache** | Redis | 7 | (future pub/sub) |
| **Container** | Docker | - | Orchestration |
| **Quality** | jscpd | 4.0.5 | Duplicate detection |

---

## ✅ Flujos Completados (D+E)

- ✅ Detección y eliminación de código duplicado (D)
- ✅ Dockerización con docker-compose (E)
- ✅ Scripts operacionales (E)
- ✅ Documentación arquitectónica (E)

## 🔮 Flujos Futuros (C, Seguridad, Integración)

- 🔄 Tests unitarios e integración (C)
- 🔄 Event listeners con agentes
- 🔄 Multi-instancia con Redis
- 🔄 Vault integration para secretos
- 🔄 RBAC + auditoría avanzada

---

**Versión:** 1.0.0  
**Estado:** ✅ FASES D+E COMPLETADAS  
**Próximo:** Task C (Testing)
