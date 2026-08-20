# Panel de Configuración AURA

## Visión General

El Panel de Configuración es una interfaz profesional para gestionar la configuración del sistema AURA de forma centralizada. Permite editar, validar, guardar y restaurar configuraciones con snapshots automáticos.

## Funcionalidades

### 1. **Edición de Configuración**
- Formularios seccionales con validación en tiempo real.
- Tres secciones principales:
  - **Identidad del Agente**: nombre, rol, estado (activo/desactivado).
  - **Servidor Core**: host, puerto, WebSocket, nivel de logging.
  - **Repositorio**: rutas a prompts, templates, forms, knowledge base.

### 2. **Validación**
- Validación en frontend con `react-hook-form` (campos requeridos, rangos, minLength).
- Validación en backend con `ajv` contra JSON Schema.
- Previsualización (endpoint `POST /api/config/preview`) para detectar errores antes de guardar.
- Mensajes de error inline en cada campo.

### 3. **Persistencia y Snapshots**
- Configuración guardada en `config/config.json`.
- Snapshots automáticos en `config/backups/` antes de guardar cambios.
- Historial de cambios con metadatos (createdAt, createdBy).
- Restauración de snapshots anteriores (rollback).

### 4. **Seguridad**
- Endpoints protegidos con autenticación JWT (preparados para `requireScope`).
- Validación de rutas para evitar path traversal.
- Datos sensibles no se guardan en texto plano (preparado para integración con vault).

## Endpoints API

### GET `/api/config`
Obtiene la configuración actual.

**Response:**
```json
{
  "config": {
    "meta": { "version": "1.0.0", ... },
    "agent": { "name": "AURA Orchestrator", ... },
    "core": { "host": "localhost", "port": 3000, ... },
    "repositories": { ... }
  }
}
```

### PUT `/api/config`
Reemplaza la configuración completa. Valida contra el schema y crea snapshot previo.

**Request:**
```json
{
  "meta": { "version": "1.0.0" },
  "agent": { "name": "...", "role": "...", "enabled": true },
  "core": { "host": "...", "port": 3000, ... },
  "repositories": { ... }
}
```

**Response:**
```json
{ "ok": true }
```

### POST `/api/config/preview`
Valida configuración sin aplicar cambios.

**Request:** Igual que PUT.

**Response (válido):**
```json
{ "valid": true }
```

**Response (inválido):**
```json
{
  "valid": false,
  "errors": {
    "/core/port": ["minimum: must be >= 1024"],
    "/agent/name": ["required"]
  },
  "rawErrors": [...]
}
```

### GET `/api/config/history`
Lista todos los snapshots guardados.

**Response:**
```json
{
  "snapshots": [
    {
      "file": "/app/config/backups/2025-12-13T10-30-45-123abc.json",
      "createdAt": "2025-12-13T10:30:45.123Z",
      "createdBy": "user@example.com"
    }
  ]
}
```

### POST `/api/config/restore`
Restaura un snapshot anterior.

**Request:**
```json
{ "file": "/app/config/backups/2025-12-13T10-30-45-123abc.json" }
```

**Response:**
```json
{
  "ok": true,
  "config": { ... }
}
```

## Estructura de Archivos

```
core-aura-mcp/
├── config/
│   ├── config.schema.json          # Schema JSON para validación
│   ├── config.json                 # Configuración actual
│   └── backups/                    # Snapshots históricos
├── src/
│   ├── api/routes/
│   │   └── config.ts               # Endpoints de configuración
│   ├── services/
│   │   └── configService.ts        # Lógica de persistencia y snapshots
│   └── ...
└── ui/src/
    ├── config/
    │   ├── ConfigPage.tsx          # Página principal
    │   ├── ConfigForm.tsx          # Formulario compuesto
    │   ├── sections/
    │   │   ├── AgentSection.tsx
    │   │   ├── CoreSection.tsx
    │   │   └── RepositoriesSection.tsx
    │   └── utils/
    │       └── formUtils.tsx        # Utilidades compartidas
    └── services/
        └── configApi.ts            # Cliente API
```

## Cómo Usar

### Acceso a la UI

1. **Desarrollo local:**
   ```bash
   cd core-aura-mcp
   npm install
   npm run dev
   ```
   Abre http://localhost:5678 → Panel de Control → Configuración

2. **Docker:**
   ```bash
   docker-compose up
   ```
   Accede a http://localhost:5678

### Flujo Típico

1. **Abrir panel**: Navega a la sección "CONFIGURACIÓN".
2. **Editar campos**: Rellena los campos con valores válidos.
3. **Previsualizar**: Click en "Previsualizar" para validar sin guardar.
4. **Guardar**: Click en "Guardar" para aplicar cambios y crear snapshot.
5. **Restaurar (si es necesario)**: Click en "Historial / Restore" para ver snapshots y restaurar uno anterior.

## Validaciones

### Identidad del Agente
- **Nombre**: Requerido, mínimo 1 caracter.
- **Rol**: Requerido.
- **Estado**: Booleano (Activo/Desactivado).

### Servidor Core
- **Host**: Requerido (string).
- **Puerto**: Requerido, rango 1024-65535.
- **WebSocket**: Booleano.
- **Nivel de log**: Selección (debug, info, warn, error).

### Repositorio
- Rutas opcionales pero deben ser válidas si se proporcionan.

## Integración con Agentes y Templates

El panel de Configuración es agnóstico al sistema de agentes. Los campos de "Identidad del Agente" pueden integrarse con:
- [AGENTS.md](../../AGENTS.md) para gestionar personajes y roles.
- [AgentTemplateBuilder](../../core-aura-mcp/src/core/agentTemplateBuilder.ts) para inyectar personas dinámicamente.

Ejemplo de integración futura:
```typescript
// en ConfigPage.tsx
import { agentTemplateBuilder } from '../../../core/agentTemplateBuilder';

async function onSave(data: any) {
  await putConfig(data);
  // Inyectar agent persona en builder
  agentTemplateBuilder.updateAgentPersona(data.agent.name, data.agent.role);
}
```

## Refactoring y Buenas Prácticas

### Componentes Reutilizables
- **formUtils.tsx**: Funciones compartidas (`renderFieldError`, `renderPathHelper`, estilos).
- **Secciones modulares**: Cada sección es independiente y reutilizable.

### Detección de Duplicados
Ejecuta para detectar código duplicado:
```bash
npm run duplicate-check
```

Salida esperada: reporte de archivos duplicados (si los hay).

### Testing (Próximo)
```bash
npm run test
```

## Seguridad y Mejoras Futuras

### Actual
- ✅ Validación de entrada (schema + inline).
- ✅ Protección contra path traversal en snapshots.
- ✅ Autorización (preparada con `requireScope`).

### Próximas Iteraciones
- 🔄 Encriptación de secretos en config.json.
- 🔄 Integración con HashiCorp Vault para credenciales.
- 🔄 Auditoría de cambios (quién, cuándo, qué cambió).
- 🔄 Diff visual entre versiones.
- 🔄 Exportación/importación de configuraciones (JSON/YAML).

## Troubleshooting

### Panel no carga
- Verifica que el backend esté corriendo en http://localhost:3000.
- Revisa la consola del navegador para errores de red.

### Validación fallida
- Asegúrate de que el puerto está en rango 1024-65535.
- Nombres y roles no pueden estar vacíos.

### Snapshots no se crean
- Verifica permisos de carpeta `config/backups/`.
- Revisa logs del servidor: `npm run dev`.

## Contacto y Soporte

Para preguntas o problemas, abre un issue en el repositorio o consulta [CONTRIBUTING.md](../../CONTRIBUTING.md).
