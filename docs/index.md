# AURA MCP - Complete Documentation

## 📚 Tabla de Contenidos

### Primeros Pasos
- [Quick Start](./QUICK-START.md) - Comienza en 5 minutos
- [Instalación](./INSTALLATION.md) - Setup detallado
- [Estructura del Proyecto](./PROJECT-STRUCTURE.md) - Carpetas y archivos

### Conceptos Fundamentales
- [Agent Templates](./AGENT-TEMPLATES.md) - Composición de prompts
- [Event-Driven Architecture](./EVENT-DRIVEN.md) - Pub/sub y EventBus
- [Microservices](./MICROSERVICES.md) - Separación de servicios
- [Authentication & RBAC](./AUTH.md) - JWT y seguridad

### Guías Prácticas
- [Crear tu Primer Agente](./GUIDE-FIRST-AGENT.md)
- [Advanced Agentes](./GUIDE-ADVANCED.md)
- [CLI Commands Reference](./CLI-REFERENCE.md)
- [Contributing Guide](./CONTRIBUTING.md)

### Deployment & Ops
- [Docker & Docker Compose](./DOCKER.md)
- [Kubernetes](./KUBERNETES.md)
- [Scaling Guide](./SCALING.md)
- [Monitoring](./MONITORING.md)

### Architecture
- [ADRs (Architecture Decision Records)](./adr/) - Decisiones clave
- [System Design](./SYSTEM-DESIGN.md)
- [Performance Tuning](./PERFORMANCE.md)

### Examples
- [Hello World](../examples/simple-agent.ts)
- [Calculator Agent](../examples/calculator-agent.ts)
- [LLM Agent](../examples/llm-agent.ts)
- [Event-Driven Agent](../examples/event-agent.ts)

### Videos
- [Video Tutorial Series](./VIDEO-TUTORIALS.md)

## 🔗 Links Rápidos

| Recurso | URL |
|---------|-----|
| GitHub | https://github.com/aura-project/aura-mcp |
| NPM | https://npmjs.com/@aura-mcp/core |
| Community | https://discord.gg/aura-mcp |
| Issues | https://github.com/aura-project/aura-mcp/issues |

## 🚀 Quick Commands

```bash
# Crear proyecto
aura init my-aura-app

# Generar agente
aura generate:agent --name my_agent

# Dev con HMR
aura dev

# Debug con breakpoints
aura debug

# Tests
aura test:core --watch

# Devtools
http://localhost:9999
```

## 📊 Version Info

- **Current Version**: 1.0.0
- **Release Date**: 2025-01-15
- **Node Version**: 18+
- **TypeScript**: 5.0+

---

**Need help?** Check [FAQ](./FAQ.md) or open [GitHub Issue](https://github.com/aura-project/aura-mcp/issues)
