# AURA Dashboard - MCP Imported Tab

## 🎯 Objetivo

Interfaz visual para gestionar MCPs importados desde PDFs/TXT dentro del Dashboard de AURA.

## 📍 Ubicación en Dashboard

Tab: **📦 MCPs Importados** (junto a Status, Orchestration, Performance, Config, Docs)

## ✨ Características

### 1. Lista de MCPs

**Columna Izquierda** (lg:col-span-1):
- Listado vertical de todos los MCPs importados
- Cada item muestra:
  - Título (truncado)
  - Nombre del archivo
  - Status badge (raw_import, refined, validated, published)
- Click selecciona el MCP para ver detalles
- Scroll automático si hay muchos items

### 2. Panel de Detalles

**Columna Derecha** (lg:col-span-2):
Cuando se selecciona un MCP, muestra:

#### Header
- Título del MCP
- Descripción
- Botón "Eliminar" (soft delete)

#### Metadata Grid (2x2)
- **Importado desde**: Nombre del archivo original (formato monospace)
- **Fecha de importación**: Timestamp legible
- **Palabras**: Conteo de palabras
- **Líneas**: Conteo de líneas

#### Acciones (4 botones full-width)
1. **🔍 Ver contenido** — Abre modal con contenido bruto/limpio
2. **🔄 Refinar automáticamente** — Dispara refinamiento (Orchestrator)
3. **✅ Validar** — Ejecuta validación y muestra resultado
4. **📤 Exportar** — Descarga como JSON/YAML/TS/Markdown

#### Status Detail
- Color contextual según status actual
- Descripción del status
- Próximos pasos recomendados

## 🔄 Flujo de Estados

```
📥 raw_import
    ↓
    ├─→ 🔄 Refinar → ✨ refined
    └─→ ✅ Validar → ✅ validated
            ↓
         🚀 Publicar → 🚀 published
```

## 🔌 API Endpoints Usados

- `GET /api/mcp` — Listar todos los MCPs
- `GET /api/mcp/:id` — Obtener detalles de un MCP
- `POST /api/mcp/validate` — Validar MCP
- `DELETE /api/mcp/:id` — Eliminar MCP (soft delete)

## 🎨 Estilos & Colores

| Estado | Color | Clase |
|--------|-------|-------|
| raw_import | Amarillo | `bg-yellow-900 text-yellow-400` |
| refined | Azul | `bg-blue-900 text-blue-400` |
| validated | Verde | `bg-green-900 text-green-400` |
| published | Púrpura | `bg-purple-900 text-purple-400` |

## 📱 Responsividad

- **Desktop** (lg): 3 columnas (lista + detalle lado a lado)
- **Tablet/Mobile**: 1 columna (lista arriba, detalle abajo)

## 🧪 Interacciones

| Acción | Efecto |
|--------|--------|
| Click en MCP | Selecciona y muestra detalle |
| Click "Actualizar" | Refresca lista desde servidor |
| Click "Eliminar" | Confirma y soft-deletes (renombra a .deleted) |
| Click "Refinar" | Emite evento al Orchestrator |
| Click "Validar" | Ejecuta validación y muestra modal |
| Click "Exportar" | Descarga archivo en formato seleccionado |

## 🔒 Seguridad

- ✅ Validación de input en rutas API
- ✅ Soft delete (no elimina realmente, renombra a .deleted)
- ✅ Path traversal prevention en GET /:id
- ✅ CORS y autenticación via JWT headers

## 🚀 Mejoras Futuras

- Modal "Ver contenido" con syntax highlighting
- Buscar/filtrar MCPs
- Bulk operations (multi-select, delete)
- Historial de cambios (audit log)
- Integración con Knowledge Graph
- Auto-sync con carpeta mcp_imported

---

**Version**: 1.0.0
**Last Updated**: 2025-01-15
