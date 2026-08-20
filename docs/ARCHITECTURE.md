# AURA MCP - Architecture Overview

## 🏛️ Arquitectura de Alto Nivel

```
┌─────────────────────────────────────────────────────────────┐
│                        Client Layer                         │
│  (Dashboard React + CLI + External Clients)                 │
└────────────────┬────────────────────────────────────────────┘
                 │ HTTP/WebSocket
┌────────────────▼────────────────────────────────────────────┐
│                      API Gateway Layer                      │
│  (Express Router + Auth Middleware + Rate Limiting)         │
└────────────────┬────────────────────────────────────────────┘
                 │
    ┌────────────┼────────────────┐
    │            │                │
    ▼            ▼                ▼
┌─────────┐  ┌────────────┐  ┌────────────┐
│ Status  │  │   Agents   │  │    MCP     │
│ Routes  │  │   Routes   │  │   Routes   │
└─────────┘  └────────────┘  └────────────┘
    │            │                │
    └────────────┼────────────────┘
                 │
┌────────────────▼────────────────────────────────────────────┐
│                     Core Services Layer                     │
│  (Agent Orchestration, Auth, Logging, Metrics)             │
└────────────────┬────────────────────────────────────────────┘
                 │
    ┌────────────┼─────────────────┬──────────────┐
    │            │                 │              │
    ▼            ▼                 ▼              ▼
┌─────────┐  ┌──────────┐  ┌──────────────┐  ┌────────┐
│EventBus │  │TokenMgr  │  │MetricsCol    │  │Logger  │
└─────────┘  └──────────┘  └──────────────┘  └────────┘
    │            │                 │              │
    └────────────┼─────────────────┴──────────────┘
                 │
┌────────────────▼────────────────────────────────────────────┐
│              Persistence & External Services                │
│  (PostgreSQL, Redis, S3, EventBus Queue)                   │
└─────────────────────────────────────────────────────────────┘
```

## 🔌 Componentes Clave

### 1. Capa de Cliente

#### Dashboard (React)
- Tabs: Status, Agents, MCPs, Performance, Config, Docs
- Real-time updates vía WebSocket
- Responsive design (mobile-first)

#### CLI Tool (@oclif)
- Comandos: `aura init`, `aura ingest`, `aura validate`, `aura refine`
- Rich feedback con Chalk + Ora spinners
- Compatible con CI/CD pipelines

### 2. API Gateway (Express)

```typescript
app.use(helmet()); // Security headers
app.use(rateLimit()); // Rate limiting
app.use(authMiddleware); // JWT validation
app.use('/api/*', errorHandler); // Global error handling
```

**Rutas**:
- `/api/status` — Health check
- `/api/agents/*` — Agent management
- `/api/mcp/*` — MCP management
- `/api/logs/*` — Log retrieval
- `/api/metrics/*` — Metrics & telemetry

### 3. Core Services

#### AgentCoordinator
- Orquestación basada en eventos
- Ejecución de agentes
- Event sourcing

#### TokenManager
- JWT generation/verification
- Refresh token rotation
- Token reuse detection

#### MetricsCollector
- Latency p50/p95/p99
- Error rates & rates
- Agent utilization

#### Logger
- Correlation IDs
- Structured logging
- Memory + HTTP transports

#### EventBus
- Pub/Sub centralizado
- 8+ tipos de eventos
- Event sourcing log

### 4. Persistence

#### PostgreSQL
- Event log (audit trail)
- Agent executions
- Metrics historical
- Audit logs

#### Redis
- Cache de agentes
- Session store
- Rate limiting counters

#### S3/Minio
- Logs en archivos grandes
- MCPs importados
- Backups

## 🔐 Flujo de Autenticación

```
Client Request
    ↓
Extract JWT from Header
    ↓
Verify Signature + Expiry
    ↓
Check Token Family (reuse detection)
    ↓
Load User Scopes
    ↓
✅ Proceed / ❌ Reject (401/403)
```

## 📊 Flujo de Datos (Ejemplo: Agent Execution)

```
1. CLI: aura ingest documento.pdf
    ↓
2. Python script: extract text from PDF
    ↓
3. importMcpFile(): validate + move to mcp_imported/
    ↓
4. AgentEvents.emit('mcp:imported', ...)
    ↓
5. Dashboard escucha + actualiza lista
    ↓
6. POST /api/mcp/validate (validación)
    ↓
7. Orchestrator: dispara refinamiento (event)
    ↓
8. DeveloperAgent: extrae tools/resources/prompts
    ↓
9. EventBus.emit('mcp:refined')
    ↓
10. Dashboard muestra status actualizado
```

## 🎯 Event-Driven Architecture

```
Agent ejecuta → AgentExecutionStarted emitted
    ↓
Logger escucha → registra en DB
    ↓
MetricsCollector escucha → actualiza stats
    ↓
UI escucha vía WebSocket → actualiza dashboard
```

## 🔄 Ciclo de Vida de un MCP

```
📥 raw_import (PDF→JSON)
    ↓
    └─→ [Análisis automático via Orchestrator]
        ↓
        ├─→ Tools extractor (DeveloperAgent)
        ├─→ Resources extractor (AnalystAgent)
        └─→ Prompts generator (OrchestratorAgent)
    ↓
✨ refined (tiene tools/resources/prompts)
    ↓
    └─→ [Validación contra schema]
    ↓
✅ validated
    ↓
    └─→ [Publicación / Export]
    ↓
🚀 published
```

## 🚀 Scaling Horizontal

### Microservicios (Future)

```
┌─────────────────────────────────────────┐
│         Load Balancer (Nginx)           │
└────────────┬────────────────────────────┘
             │
    ┌────────┼────────┐
    ▼        ▼        ▼
┌────┐   ┌────┐   ┌────┐
│Pod1│   │Pod2│   │Pod3│  (Kubernetes)
└────┘   └────┘   └────┘
    │        │        │
    └────────┼────────┘
             │
        ┌────▼────────────┐
        │  EventBus Queue │  (RabbitMQ/Kafka)
        └────┬────────────┘
             │
    ┌────────┼──────────┐
    ▼        ▼          ▼
┌──────┐ ┌──────┐  ┌──────┐
│ PgSQL│ │Redis │  │Minio │
└──────┘ └──────┘  └──────┘
```

### Auto-scaling (HPA)

```yaml
minReplicas: 3
maxReplicas: 10
targetCPUUtilization: 70%
targetMemoryUtilization: 80%
```

## 📈 Observabilidad

```
Application
    ↓
OpenTelemetry Instrumentation
    ↓
    ├─→ Jaeger (traces)
    ├─→ Prometheus (metrics)
    ├─→ ELK/Loki (logs)
    └─→ DataDog (APM)
    ↓
Grafana (dashboards)
    ↓
AlertManager (alerting)
```

## 🔒 Capas de Seguridad

### 1. Transport
- ✅ HTTPS/TLS 1.2+ (obligatorio)
- ✅ HSTS headers

### 2. Authentication
- ✅ JWT con refresh tokens
- ✅ Token reuse detection

### 3. Authorization
- ✅ RBAC con scopes
- ✅ Rate limiting (global, IP, agent)

### 4. Data Protection
- ✅ AES-256-GCM encryption (secrets)
- ✅ PBKDF2 password hashing
- ✅ Prepared statements (SQL injection prevention)

### 5. Audit
- ✅ Immutable event log
- ✅ Correlation ID tracking
- ✅ 90-day retention (GDPR)

## 🧪 Testing Strategy

```
Unit Tests (70%)
    ↓ Test business logic
    ├─ Auth logic
    ├─ Validation
    └─ Calculations

Integration Tests (20%)
    ↓ Test components together
    ├─ API endpoints
    ├─ Database interactions
    └─ Event flows

E2E Tests (10%)
    ↓ Test complete flows
    ├─ CLI commands
    ├─ Dashboard interactions
    └─ MCP ingestion pipeline
```

## 📦 Deployment Artifacts

```
Docker Image
    ├─ Multi-stage build
    ├─ Non-root user
    ├─ Health checks
    └─ Size optimized (~200MB)

Kubernetes Manifests
    ├─ Deployment
    ├─ Service
    ├─ ConfigMap
    ├─ Secret
    ├─ HPA
    ├─ PDB
    └─ NetworkPolicy

Helm Chart (future)
    └─ Values templates
```

## 🔄 CI/CD Pipeline

```
GitHub Push
    ↓
1. Lint & Format Check
2. Type Check (tsc)
3. Unit Tests (vitest)
4. Build Docker Image
5. Push to Registry
6. E2E Tests
7. Security Scan
8. Deploy to Staging
9. Smoke Tests
10. Deploy to Production
```

## 📚 Componentes por Responsabilidad

| Responsabilidad | Componente | Ubicación |
|-----------------|-----------|-----------|
| Orquestación | Orchestrator Agent | core-aura-mcp/src |
| Autenticación | TokenManager | core-aura-mcp/src/lib |
| Logging | Logger | core-aura-mcp/src/lib |
| Métricas | MetricsCollector | core-aura-mcp/src/lib |
| Eventos | EventBus | core-aura-mcp/src/lib |
| Validación | Zod Schemas | core-aura-mcp/src/lib |
| Ingesta | MCPImporter | core-aura-mcp/src/mcp |
| CLI | @oclif | packages/cli |
| Dashboard | React | core-aura-mcp/ui |

---

**Version**: 1.0.0
**Last Updated**: 2025-01-15
**Maintainers**: AURA Team
