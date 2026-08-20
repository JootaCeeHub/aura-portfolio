# Panel de Configuración - Guía de Despliegue

## Requisitos

- Node.js >= 18.0.0
- Docker y Docker Compose (opcional, para despliegue containerizado)
- npm >= 9.0.0

## Instalación Local (Desarrollo)

### 1. Instalar Dependencias

```bash
cd core-aura-mcp
npm install
```

Esto instalará:
- `ajv` (v8.12.0): Validación de JSON Schema
- `react-hook-form` (v7.48.0): Gestión de formularios reactivos
- `jscpd` (v4.0.5): Detección de código duplicado

### 2. Crear Archivo de Configuración Inicial

Crea `core-aura-mcp/config/config.json` con contenido inicial:

```json
{
  "meta": {
    "version": "1.0.0",
    "lastChangedBy": "system",
    "lastChangedAt": "2025-12-13T00:00:00Z"
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

### 3. Ejecutar en Desarrollo

```bash
npm run dev
```

Esto inicia:
- **Backend**: http://localhost:3000
- **Frontend/UI**: http://localhost:5678

Navega a http://localhost:5678 → Panel de Control → **CONFIGURACIÓN**

## Despliegue con Docker

### 1. Construcción

```bash
docker-compose build
```

### 2. Ejecución

```bash
docker-compose up
```

**Servicios disponibles:**
- Core (backend): http://localhost:3000
- UI (frontend): http://localhost:5678
- PostgreSQL: localhost:5432
- Redis: localhost:6379

### 3. Detener

```bash
docker-compose down
```

## Migraciones y Restauración

### Migrar Configuración desde Anterior Instalación

```bash
bash scripts/migrate-config.sh /ruta/anterior /ruta/nueva
```

**Ejemplo:**
```bash
bash scripts/migrate-config.sh /home/user/aura-old ~/aura-new
```

### Restaurar desde Snapshot

```bash
node scripts/restore-config.js config/backups/2025-12-13T10-30-45-123.json ./config/
```

### Ver Historial de Snapshots

Accede al panel → Historial / Restore, o revisa la carpeta `config/backups/`.

## Verificación de Código Duplicado

Ejecuta la herramienta `jscpd` para detectar código duplicado:

```bash
npm run duplicate-check
```

**Salida esperada:**
```
JSCPD Report
Found X clones
Percentage: Y%
```

El código ha sido refactorizado para eliminar duplicaciones en las funciones `renderFieldError`, `renderPathHelper` y estilos de sección (ahora en `formUtils.tsx`).

## Testing (Próximo)

```bash
npm test
```

Ejecutará pruebas unitarias para:
- `configService` (persistencia, snapshots, load/save)
- Endpoints `/api/config/*`
- Componentes React (ConfigForm, secciones)

## Estructura de Carpetas Clave

```
core-aura-mcp/
├── config/
│   ├── config.schema.json        # JSON Schema para validación
│   ├── config.json               # Configuración actual
│   └── backups/                  # Histórico de snapshots
├── src/
│   ├── api/routes/
│   │   └── config.ts             # Endpoints: GET, PUT, preview, history, restore
│   ├── services/
│   │   └── configService.ts      # Lógica de persistencia
│   └── mcpServer.ts              # Servidor Express con enrutador
└── ui/src/
    ├── config/
    │   ├── ConfigPage.tsx
    │   ├── ConfigForm.tsx
    │   ├── sections/
    │   └── utils/
    │       └── formUtils.tsx      # Utilidades compartidas
    └── services/
        └── configApi.ts          # Cliente API
```

## Variables de Entorno

En `docker-compose.yml`:

```yaml
environment:
  AURA_CONFIG_PATH: /app/config/config.json
  AURA_CONFIG_SNAPSHOTS: /app/config/backups
  VITE_AURA_CORE_URL: http://localhost:3000
```

Personaliza según tu entorno.

## Troubleshooting

### El panel no carga después de `npm run dev`

1. Verifica que el puerto 3000 (backend) está disponible.
2. Verifica que el puerto 5678 (frontend) está disponible.
3. Revisa la consola: `npm run dev` muestra errores de compilación.

### Error "Config file not found"

Crea manualmente `core-aura-mcp/config/config.json` con el JSON de ejemplo anterior.

### Puerto 3000 ya está en uso

```bash
# En Windows (PowerShell)
Get-Process | Where-Object { $_.Port -eq 3000 } | Stop-Process

# En Linux/Mac
lsof -i :3000 | grep LISTEN | awk '{print $2}' | xargs kill -9
```

### Docker: Contenedor se detiene inmediatamente

```bash
docker-compose logs core
```

Revisa los logs para encontrar el error.

## Próximos Pasos

1. ✅ **A+B completado**: Validaciones y formularios.
2. ✅ **D completado**: Refactoring de duplicados.
3. ✅ **E completado**: Dockerización.
4. 🔄 **C próximo**: Tests unitarios e integración.
5. 🔄 **Auditoría**: Integración con sistema de agentes/templates.
6. 🔄 **Seguridad avanzada**: Vault integration para secretos.

## Documentación Completa

- [CONFIGURATION-PANEL.md](./CONFIGURATION-PANEL.md): Especificación técnica completa.
- [AGENTS.md](../AGENTS.md): Sistema de agentes y templates.
- [CONTRIBUTING.md](../CONTRIBUTING.md): Guía de contribución.

---

**Última actualización:** 13 de diciembre de 2025
