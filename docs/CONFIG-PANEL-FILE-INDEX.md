# Índice de Archivos: Panel de Configuración AURA

## 📌 Navegación Rápida

Si necesitas encontrar algo específico del Panel de Configuración, usa este índice.

---

## 📂 DOCUMENTACIÓN

### Guías de Usuario/Operacional

| Archivo | Propósito | Lee si quieres... |
|---------|-----------|------------------|
| [CONFIG-PANEL-QUICKSTART.md](./docs/CONFIG-PANEL-QUICKSTART.md) | Primeros pasos prácticos | Aprender con un ejemplo paso-a-paso |
| [CONFIG-PANEL-DEPLOYMENT.md](./docs/CONFIG-PANEL-DEPLOYMENT.md) | Instalación y despliegue | Instalar local, Docker, migrar config |
| [CONFIG-PANEL-CHECKLIST.md](./CONFIG-PANEL-CHECKLIST.md) | Verificación completa | Validar que todo funciona correctamente |

### Guías Técnicas/Arquitectura

| Archivo | Propósito | Lee si quieres... |
|---------|-----------|------------------|
| [CONFIGURATION-PANEL.md](./docs/CONFIGURATION-PANEL.md) | Especificación técnica | Entender endpoints, validaciones, detalles internos |
| [CONFIG-PANEL-ARCHITECTURE.md](./docs/CONFIG-PANEL-ARCHITECTURE.md) | Diagramas de arquitectura | Visualizar flujos de datos, componentes |
| [CONFIG-AGENT-INTEGRATION.md](./docs/CONFIG-AGENT-INTEGRATION.md) | Integración con agentes | Saber cómo config actualiza los agentes |

### Resumen de Proyecto

| Archivo | Propósito | Lee si quieres... |
|---------|-----------|------------------|
| [CONFIGURATION-PANEL-SUMMARY.md](./CONFIGURATION-PANEL-SUMMARY.md) | Resumen ejecutivo | Vista de 30.000 pies del proyecto |

---

## 💻 CÓDIGO BACKEND

### Servicios y Lógica

| Ruta | Archivo | Propósito | Responsable |
|------|---------|-----------|-------------|
| `core-aura-mcp/src/services/` | **configService.ts** | Persistencia, snapshots, load/save | Backend |
| `core-aura-mcp/config/` | **config.schema.json** | JSON Schema para validación Ajv | Backend |
| `core-aura-mcp/config/` | **config.json** | Configuración actual (runtime) | Data |
| `core-aura-mcp/config/backups/` | **[UUID].json** | Snapshots automáticos | Data |

### Rutas y Endpoints

| Ruta | Archivo | Endpoints | Responsable |
|------|---------|-----------|-------------|
| `core-aura-mcp/src/api/routes/` | **config.ts** | GET, PUT, POST /preview, GET /history, POST /restore | Backend |
| `core-aura-mcp/src/` | **mcpServer.ts** | Integración del router en Express | Backend |

### Integración

| Ruta | Archivo | Propósito | Estado |
|------|---------|-----------|--------|
| `core-aura-mcp/core/` | **agentManager.ts** | Escucha eventos config-updated | Futuro (D+E → evento implementado en ConfigService) |
| `core-aura-mcp/core/` | **agentTemplateBuilder.ts** | Construye prompts con config dinámica | Futuro |

---

## 🎨 CÓDIGO FRONTEND

### Páginas y Componentes Principales

| Ruta | Archivo | Propósito | Estado |
|------|---------|-----------|--------|
| `core-aura-mcp/ui/src/config/` | **ConfigPage.tsx** | Contenedor principal, state management | ✅ Completo |
| `core-aura-mcp/ui/src/config/` | **ConfigForm.tsx** | Wrapper react-hook-form, validación | ✅ Completo |

### Componentes de Sección

| Ruta | Archivo | Campos | Refactorizado |
|------|---------|--------|---------------|
| `core-aura-mcp/ui/src/config/sections/` | **AgentSection.tsx** | name, role, enabled | ✅ Usa formUtils |
| `core-aura-mcp/ui/src/config/sections/` | **CoreSection.tsx** | host, port, enableWs, logLevel | ✅ Usa formUtils |
| `core-aura-mcp/ui/src/config/sections/` | **RepositoriesSection.tsx** | promptsPath, templatesPath, formsPath, knowledgePath | ✅ Usa formUtils |

### Utilidades Compartidas

| Ruta | Archivo | Exporta | Impacto |
|------|---------|---------|---------|
| `core-aura-mcp/ui/src/config/utils/` | **formUtils.tsx** | renderFieldError(), renderPathHelper(), sectionStyles | Elimina 14 duplicados |

### Cliente API

| Ruta | Archivo | Funciones | Responsable |
|------|---------|-----------|-------------|
| `core-aura-mcp/ui/src/services/` | **configApi.ts** | getConfig(), putConfig(), previewConfig(), getHistory(), restoreSnapshot() | Frontend |

---

## 🐳 DEVOPS Y DEPLOYMENT

### Docker

| Archivo | Propósito | Servicios |
|---------|-----------|-----------|
| **docker-compose.yml** | Orquestación de contenedores | postgres, redis, core, ui |
| **core-aura-mcp/Dockerfile** | Imagen backend | Node.js + config paths |
| **core-aura-mcp/ui/Dockerfile** | Imagen frontend | Vite + React |

### Scripts Operacionales

| Ruta | Archivo | Propósito | Uso |
|------|---------|-----------|-----|
| `scripts/` | **migrate-config.sh** | Migrar config entre entornos | `bash migrate-config.sh /old /new` |
| `scripts/` | **restore-config.js** | Restaurar desde snapshot | `node restore-config.js file.json` |

---

## 📦 CONFIGURACIÓN Y DEPENDENCIAS

### package.json (Cambios)

| Dependencia | Versión | Propósito | Agregado en |
|-------------|---------|-----------|-------------|
| `ajv` | 8.12.0 | Validación JSON Schema (servidor) | Phase A |
| `react-hook-form` | 7.48.0 | Gestión de formularios (cliente) | Phase B |
| `jscpd` | 4.0.5 | Detección de duplicados (dev) | Phase D |

### Scripts npm

| Script | Comando | Propósito |
|--------|---------|-----------|
| `dev` | concurrently "npm run dev:server" "npm run dev:ui" | Inicia backend + frontend |
| `dev:server` | ts-node src/server.ts | Backend desarrollo |
| `dev:ui` | vite | Frontend desarrollo |
| `build` | npm run build:server && npm run build:ui | Build producción |
| `duplicate-check` | jscpd --pattern ... | Detectar código duplicado |

---

## 🔄 FLUJOS Y PROCESOS

### Cambiar Configuración (Usuario)

```
ConfigPage.tsx (Usuario edita)
    ↓
ConfigForm.tsx (react-hook-form valida)
    ↓
Click "Preview" → POST /api/config/preview
    ↓
Backend: Ajv valida, normaliza errores
    ↓
Muestra errores si hay, o "Válido" si está ok
    ↓
Click "Guardar" → PUT /api/config
    ↓
Backend: configService.save()
  ├─ createSnapshot() (backup)
  ├─ fs.writeFile() (save)
  └─ emit('config-updated') (futuro - agentes)
    ↓
UI muestra "✓ Guardado"
```

### Restaurar Configuración

```
User clicks "Historial"
    ↓
Modal muestra snapshots (GET /api/config/history)
    ↓
Click "Restaurar" en snapshot X
    ↓
POST /api/config/restore { file: 'uuid.json' }
    ↓
Backend: configService.restore()
  ├─ Read snapshot
  ├─ createSnapshot() de estado actual (auditoría)
  ├─ fs.writeFile() config con snapshot anterior
    ↓
UI recarga configuración
```

### Despliegue Docker

```
docker-compose build
    ↓
Builds postgres, redis, core, ui images
    ↓
docker-compose up
    ↓
Inicia 4 servicios en aura-network
    ↓
Health checks validan postgres + redis
    ↓
Accede a http://localhost:5678
```

---

## 🎯 BÚSQUEDA POR CASO DE USO

### "Necesito cambiar la validación de campos"
1. Para servidor: Edita `config/config.schema.json` (propiedades, required)
2. Para cliente: Edita `ConfigForm.tsx` o secciones (register options)
3. Test: Usa Preview en UI antes de guardar

**Archivos:**
- `config/config.schema.json`
- `ui/src/config/ConfigForm.tsx`
- `ui/src/config/sections/*.tsx`

---

### "Necesito agregar un campo nuevo"
1. Agrega a `config.schema.json` (propiedades)
2. Agrega a `config.json` (valor default)
3. Crea en sección correspondiente (AgentSection/CoreSection/etc)
4. Usa `register()` con validaciones
5. Test con Preview

**Archivos:**
- `config/config.schema.json`
- `config/config.json`
- `ui/src/config/sections/*.tsx`

---

### "Necesito debuggear un error de validación"
1. En UI: Usa Preview para ver errores formateados
2. En Backend: Revisa `configService.save()` → Ajv validation
3. En API: Usa curl para testear endpoint `/api/config/preview`

**Archivos:**
- `src/api/routes/config.ts` (endpoint)
- `src/services/configService.ts` (lógica)
- `ui/src/services/configApi.ts` (cliente)

---

### "Necesito ver historial de cambios"
1. UI: Click "Historial" → Modal muestra snapshots
2. Archivo: Revisa `config/backups/[uuid].json`
3. API: GET `/api/config/history`

**Archivos:**
- `config/backups/` (datos)
- `src/api/routes/config.ts` (endpoint GET /history)
- `ui/src/config/ConfigPage.tsx` (UI modal)

---

### "Necesito restaurar a versión anterior"
1. UI: Click "Historial" → Selecciona snapshot → Click "Restaurar"
2. CLI: `node scripts/restore-config.js config/backups/[uuid].json ./config/`
3. API: POST `/api/config/restore`

**Archivos:**
- `scripts/restore-config.js` (CLI)
- `src/api/routes/config.ts` (endpoint POST /restore)
- `ui/src/config/ConfigPage.tsx` (UI)

---

### "Necesito desplegar con Docker"
1. Edita `docker-compose.yml` si es necesario
2. Ejecuta `docker-compose build`
3. Ejecuta `docker-compose up`
4. Accede a http://localhost:5678

**Archivos:**
- `docker-compose.yml`
- `core-aura-mcp/Dockerfile`
- `core-aura-mcp/ui/Dockerfile` (si existe)

---

### "Necesito migrar config de otro entorno"
```bash
bash scripts/migrate-config.sh /ruta/anterior /ruta/nueva
```

**Archivos:**
- `scripts/migrate-config.sh` (bash script)

---

### "Necesito integrar cambios de config con agentes"
1. Implementa listener en `agentManager.ts`
2. Escucha evento 'config-updated' del `configService.ts`
3. Recarga contexto de agentes

**Archivos:**
- `src/services/configService.ts` (emit evento)
- `agents/core/agentManager.ts` (listener)
- `docs/CONFIG-AGENT-INTEGRATION.md` (guía)

---

## 🧪 TESTING (Próximo - Task C)

### Dónde van los tests

```
tests/
├── unit/
│   ├── configService.test.ts          ← Persistencia, snapshots
│   ├── ajv-validation.test.ts         ← Schema validation
│   └── formUtils.test.ts              ← Utilidades compartidas
├── integration/
│   ├── api-config.integration.test.ts ← Endpoints
│   └── configAgent.integration.test.ts ← Config + agents (futuro)
└── e2e/
    └── config-flow.e2e.test.ts        ← UI completo
```

### Qué testear

| Módulo | Casos |
|--------|-------|
| **configService** | load(), save(), createSnapshot(), restore() |
| **Ajv validation** | Required fields, type checking, ranges |
| **API endpoints** | GET, PUT, POST /preview, GET /history, POST /restore |
| **React components** | ConfigForm submission, error display, snapshot restore |
| **formUtils** | renderFieldError, renderPathHelper, styles |

---

## 📊 MATRIZ DE RESPONSABILIDADES

| Componente | Backend | Frontend | DevOps | Data |
|-----------|---------|----------|--------|------|
| config.json | ✓ Read/Write | ✓ Display | ✓ Volume | ✓ Current |
| config.schema.json | ✓ Validate | ✓ Display | - | ✓ Schema |
| snapshots | ✓ Create/Restore | - | ✓ Backup | ✓ History |
| ConfigPage | - | ✓ Main | - | - |
| ConfigForm | - | ✓ Form | - | - |
| Sections | - | ✓ Fields | - | - |
| formUtils | - | ✓ Share | - | - |
| configApi | ✓ API | ✓ Call | - | - |
| configService | ✓ Logic | - | - | - |
| config.ts (routes) | ✓ HTTP | - | - | - |
| docker-compose | - | - | ✓ Orch | - |
| scripts/ | ✓ Exec | - | ✓ Run | - |

---

## 🔗 RELACIONES DE ARCHIVOS

```
config.json (data)
    ↑↓
config.schema.json (validation rules)
    ↑↓
configService.ts (persistence logic)
    ↑
config.ts (API endpoints)
    ↑
configApi.ts (HTTP client)
    ↑
ConfigPage.tsx → ConfigForm.tsx → Sections (UI)

↓
Snapshots en backups/ (history)
    ↑↓
restore-config.js (CLI restore)

↓
agentManager.ts (future - config updates)
    ↑
configService emit 'config-updated'

↓
Docker services (deployment)
    ↑
docker-compose.yml
```

---

## ✅ CHECKLIST DE NAVEGACIÓN

- [ ] Encontré la guía de primeros pasos (QUICKSTART)
- [ ] Encontré instrucciones de despliegue (DEPLOYMENT)
- [ ] Encontré la especificación técnica (CONFIGURATION-PANEL)
- [ ] Encontré el checklist de verificación (CHECKLIST)
- [ ] Encontré los diagramas (ARCHITECTURE)
- [ ] Sé dónde editar validaciones (config.schema.json)
- [ ] Sé dónde editar UI (ConfigPage, sections)
- [ ] Sé dónde editar API (config.ts)
- [ ] Sé dónde editar persistencia (configService.ts)
- [ ] Sé dónde hacer despliegue (docker-compose.yml)

---

## 📞 SI NO ENCUENTRAS ALGO

### Búsqueda rápida:

1. **Sobre el API REST**: Lee `docs/CONFIGURATION-PANEL.md`
2. **Sobre components React**: Lee `ui/src/config/` archivos .tsx
3. **Sobre persistencia**: Lee `src/services/configService.ts`
4. **Sobre Docker**: Lee `docker-compose.yml`
5. **Sobre flujos**: Lee `docs/CONFIG-PANEL-ARCHITECTURE.md`

### Para ejemplo práctico:

- Lee `docs/CONFIG-PANEL-QUICKSTART.md`

### Para troubleshooting:

- Lee `docs/CONFIG-PANEL-DEPLOYMENT.md` sección troubleshooting
- Lee `CONFIG-PANEL-CHECKLIST.md`

---

**Generado:** 13 de diciembre de 2025  
**Versión:** 1.0.0  
**Última actualización:** Fases D+E completadas
