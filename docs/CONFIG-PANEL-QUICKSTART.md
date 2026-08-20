# Guía Práctica: Primeros Pasos con el Panel de Configuración

## Escenario: Tu Primer Cambio de Configuración

Supongamos que quieres cambiar el nombre del agente de "AURA Orchestrator" a "Mi Asistente Personal".

---

## ✅ Paso 1: Verificar Instalación

### Abre una terminal en la carpeta del proyecto:

```bash
cd d:/JACOB\ CERVANTES/Documents/PROGRAMING/AURA
```

### Verifica que tengas Node.js instalado:

```bash
node --version
# Resultado esperado: v18.0.0 o superior
```

### Verifica que npm esté funcionando:

```bash
npm --version
# Resultado esperado: 9.0.0 o superior
```

---

## ✅ Paso 2: Instalar Dependencias

### Navega a la carpeta core:

```bash
cd core-aura-mcp
```

### Instala todas las dependencias necesarias:

```bash
npm install
```

**Qué se está instalando:**
- `ajv` - Para validación JSON Schema
- `react-hook-form` - Para el formulario reactivo
- `jscpd` - Para detectar código duplicado (opcional pero recomendado)

**Resultado esperado:**
```
added XXX packages, and audited YYY packages in ZZs
found 0 vulnerabilities
```

---

## ✅ Paso 3: Crear Archivo de Configuración Inicial

### Verifica que existe `config/config.json`:

```bash
ls config/config.json
# Si no existe, créalo:
cat > config/config.json << 'EOF'
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
EOF
```

### Verifica que se creó:

```bash
cat config/config.json
# Debe mostrar el JSON formateado
```

---

## ✅ Paso 4: Iniciar Servidor de Desarrollo

### Desde la carpeta `core-aura-mcp`, ejecuta:

```bash
npm run dev
```

**Resultado esperado:**
```
> aura-core@1.0.0 dev
> concurrently "npm run dev:server" "npm run dev:ui"

[0] 
[0] ✔ Server started on http://localhost:3000
[1] 
[1] ✔ UI started on http://localhost:5678
```

⏸️ **NO cierres esta terminal.** Déjala corriendo.

---

## ✅ Paso 5: Abrir Navegador y Acceder al Panel

### Abre tu navegador en:

```
http://localhost:5678
```

**Qué deberías ver:**
- Interfaz de usuario AURA
- Barra de navegación superior
- Sección de "Panel de Control"

### Navega al Panel de Configuración:

1. Click en **"Panel de Control"** (o similar en el menú)
2. Busca la opción **"CONFIGURACIÓN"**
3. Click para abrir el panel

**Resultado esperado:**
```
Panel de Configuración
├── Identidad del Agente
│   ├── Nombre: "AURA Orchestrator"
│   ├── Role: "Orquestador Cognitivo"
│   └── Habilitado: [Toggle ON]
├── Core
│   ├── Host: "localhost"
│   ├── Port: "3000"
│   ├── WebSocket: [Toggle ON]
│   └── Nivel de Log: "debug"
├── Repositorios
│   ├── Ruta Prompts: "src/repository/prompts"
│   ├── Ruta Templates: "src/repository/templates"
│   ├── Ruta Formularios: "src/repository/forms"
│   └── Ruta Conocimiento: "src/repository/knowledge"
└── Botones: [Preview] [Guardar] [Historial]
```

---

## ✅ Paso 6: Cambiar el Nombre del Agente

### 1. Localiza el campo "Nombre" en la sección "Identidad del Agente"

```
Nombre: [AURA Orchestrator]  ← Click aquí para editar
```

### 2. Borra el contenido actual y escribe nuevo nombre:

```
Antes: "AURA Orchestrator"
Después: "Mi Asistente Personal"
```

**Tu pantalla ahora muestra:**
```
Nombre: [Mi Asistente Personal]
```

### 3. ¡Observa qué pasa!

- El campo **cambió**
- Notarás que no hay error (está validado)
- Los botones permanecen activos

---

## ✅ Paso 7: Validación Previa (Preview)

### Antes de guardar, haz click en botón "Preview"

```
[Preview] ← Click aquí
```

**Qué hace Preview:**
- Valida tu configuración SIN guardar
- Te muestra cualquier error antes de confirmar
- Te da oportunidad de corregir

**Resultado esperado:**
```
✓ Validación exitosa - Tu configuración es válida
  (Puedes guardar con confianza)
```

---

## ✅ Paso 8: Guardar la Configuración

### Click en botón "Guardar"

```
[Guardar] ← Click aquí
```

**Qué sucede automáticamente:**
1. ✅ Valida tu configuración (Ajv)
2. ✅ Crea un snapshot automático (backup)
   - Archivo: `config/backups/[UUID].json`
   - Contiene: Configuración anterior
   - Metadata: timestamp, usuario, ID único
3. ✅ Sobrescribe `config/config.json`
4. ✅ Retorna confirmación al servidor

**Resultado esperado en UI:**
```
✓ Guardado exitosamente
  Snapshot creado: 2025-12-13T10:30:45Z
  ID: f47ac10b-58cc-4372-a567-0e02b2c3d479
```

### Verifica en el disco:

En otra terminal (nueva):

```bash
# Ver archivo principal actualizado
cat core-aura-mcp/config/config.json | grep -A1 '"name"'
# Resultado: "name": "Mi Asistente Personal"

# Ver backup automático creado
ls -ltr core-aura-mcp/config/backups/ | tail -1
# Resultado: [UUID].json con timestamp reciente
```

---

## ✅ Paso 9: Ver Historial de Cambios

### Click en botón "Historial"

```
[Historial] ← Click aquí
```

**Modal se abre mostrando:**
```
Historial de Configuración

┌─────────────────────────────────────────────┐
│ Snapshot 1 (Más reciente)                   │
│ 2025-12-13T10:30:45Z                        │
│ Usuario: system                             │
│ Estado: AURA Orchestrator → Mi Asistente... │
│ [Restaurar]                                 │
├─────────────────────────────────────────────┤
│ Snapshot 2                                  │
│ 2025-12-13T10:00:00Z                        │
│ Usuario: system                             │
│ Estado: Configuración inicial               │
│ [Restaurar]                                 │
└─────────────────────────────────────────────┘
```

---

## ✅ Paso 10: Revertir Cambio (Opcional)

### Si te arrepientes del cambio:

1. **Click en botón "Restaurar"** del snapshot anterior

```
Snapshot 2 (Configuración inicial)
[Restaurar] ← Click aquí
```

**Qué sucede:**
1. ✅ Crea snapshot de estado actual (Mi Asistente Personal)
2. ✅ Restaura configuración anterior (AURA Orchestrator)
3. ✅ Recarga la UI automáticamente

**Resultado esperado:**
```
Nombre: [AURA Orchestrator]  ← Volvió al nombre original

Historial ahora muestra 3 snapshots:
1. Restauración a AURA Orchestrator (más reciente)
2. Cambio a Mi Asistente Personal
3. Configuración inicial
```

---

## ✅ Paso 11: Probar Validación (Comportamiento de Error)

### Intenta un cambio INVÁLIDO (para entender validaciones)

#### Cambio 1: Puerto fuera de rango

1. Ve a sección **"Core"**
2. Campo **"Port"**: cambia a "500" (menor a 1024, que es inválido)
3. Click "Preview"

**Resultado esperado:**
```
✗ Validación fallida - Errores encontrados:

/core/port: ["minimum: must be >= 1024"]

⚠️ No puedes guardar hasta corregir este error
```

#### Cambio 2: Campo requerido vacío

1. Ve a sección **"Identidad del Agente"**
2. Campo **"Nombre"**: borra el contenido
3. Click "Preview"

**Resultado esperado:**
```
✗ Validación fallida - Errores encontrados:

/agent/name: ["required"]

⚠️ El campo Nombre es obligatorio
```

**Corrección:** Escribe algo en el campo y vuelve a Preview.

---

## ✅ Paso 12: Verificar sin UI (Línea de Comandos)

### En una nueva terminal (el `npm run dev` sigue activo):

```bash
# Obtener configuración actual
curl http://localhost:3000/api/config | jq '.agent.name'
# Resultado: "AURA Orchestrator" o tu último cambio

# Validar cambio SIN guardar
curl -X POST http://localhost:3000/api/config/preview \
  -H "Content-Type: application/json" \
  -d '{"meta":{},"agent":{"name":"Test","role":"Role","enabled":true},"core":{"host":"localhost","port":9000,"enableWs":true,"logLevel":"debug"},"repositories":{}}'
# Resultado: { "valid": false, "errors": { "/core/port": [...] } }

# Ver historial de snapshots
curl http://localhost:3000/api/config/history | jq '.[] | {id, createdAt, createdBy}'
```

---

## ✅ Paso 13: Limpiar y Parar

### Para detener el servidor:

En la terminal donde corre `npm run dev`, presiona:

```
Ctrl + C
```

**Resultado esperado:**
```
^C
Killing processes...
```

### Si quieres limpiar (opcional):

```bash
# Eliminar todos los snapshots y dejar solo config.json actual
rm -rf core-aura-mcp/config/backups/*
```

---

## 🎓 Lecciones Clave de Este Ejercicio

### 1. **Preview es tu amigo**
- Antes de guardar, siempre usa Preview
- Te ahorra dolores de cabeza
- Valida sin riesgo

### 2. **Los snapshots son automáticos**
- Cada guardar crea backup automático
- Nunca pierdes versiones anteriores
- Puedes restaurar en 1 click

### 3. **Validación en dos niveles**
- **Cliente (UI):** Feedback inmediato
- **Servidor (API):** Seguridad real

### 4. **La arquitectura funciona**
- Backend: Ajv valida JSON Schema ✓
- Frontend: react-hook-form maneja estado ✓
- Persistencia: File system + snapshots ✓

---

## 🚀 Próximos Pasos Después de Esto

### Ahora que entiendes el flujo, puedes:

1. **Cambiar otros parámetros**
   ```bash
   # Log Level → debug/info/warn/error
   # WebSocket → ON/OFF
   # Rutas de Repositorio → Personalizar
   ```

2. **Ejecutar en Docker**
   ```bash
   docker-compose build
   docker-compose up
   # Accede a http://localhost:5678
   ```

3. **Migrar desde otro entorno**
   ```bash
   bash scripts/migrate-config.sh /anterior/path /nuevo/path
   ```

4. **Detectar código duplicado**
   ```bash
   npm run duplicate-check
   ```

5. **Ejecutar tests** (cuando estén listos - Task C)
   ```bash
   npm test
   ```

---

## 📞 Troubleshooting Rápido

### "No puedo acceder a http://localhost:5678"

**Solución:**
```bash
# Verifica que npm run dev está activo
# Si se detuvo, reinicia:
npm run dev

# Espera 10 segundos para que compilen ambos servicios
# Actualiza el navegador (Ctrl+F5)
```

### "Puerto 3000 ya está en uso"

**Solución (Windows - PowerShell):**
```powershell
Get-Process | Where-Object { $_.Port -eq 3000 } | Stop-Process -Force
npm run dev
```

**Solución (Linux/Mac):**
```bash
lsof -i :3000 | grep LISTEN | awk '{print $2}' | xargs kill -9
npm run dev
```

### "Preview muestra error 'must be >= 1024' pero puse 3000"

**Solución:**
- Verifica que el campo es NÚMERO, no STRING
- Si escribes "3000" (comillas), es string
- Debe ser 3000 sin comillas
- El formulario debe convertir automáticamente

---

## 📋 Checklist de Éxito

- [ ] Node.js v18+ instalado
- [ ] `npm install` completó sin errores
- [ ] `config/config.json` existe y es válido
- [ ] `npm run dev` muestra 2 servicios corriendo
- [ ] Navegador accede a http://localhost:5678
- [ ] Panel de Configuración carga correctamente
- [ ] Puedo cambiar campos y ver validación
- [ ] Preview funciona y muestra errores apropiados
- [ ] Guardar crea snapshot automático
- [ ] Historial muestra snapshots previos
- [ ] Puedo restaurar a versión anterior
- [ ] Curl/API funciona (opcional pero recomendado)

---

## 🎉 ¡Felicidades!

Has completado tu primer ciclo con el Panel de Configuración:
- ✅ Instalación
- ✅ Desarrollo local
- ✅ Cambios de configuración
- ✅ Validación
- ✅ Persistencia con snapshots
- ✅ Restauración

Ahora entiendes cómo funciona la arquitectura completa.

**Próximo nivel:** Docker, Testing, Integración con Agentes.

---

**Versión:** 1.0.0  
**Actualizado:** 13 de diciembre de 2025  
**Tiempo estimado:** 30 minutos para completar
