# ADR-002: Microservices Architecture

## Status
Accepted

## Context
Monolithic architecture becomes bottleneck at scale. Need independent deployment and scaling per service.

## Decision
Separated core into 4 microservices:
1. **AuthService**: JWT + RBAC (port 3001)
2. **AgentCoordinator**: Orquestación (port 3002)
3. **ToolRouter**: Routing de tools (port 3003)
4. **MetricsCollector**: Observabilidad (port 3004)

Communication via EventBus (RabbitMQ/Kafka in prod).

## Consequences

### Positive
- Services scale independently
- Different teams own different services
- Easy to replace/upgrade individual services
- Polyglot persistence (each service picks best DB)

### Negative
- Distributed tracing complexity
- Network latency between services
- Eventual consistency challenges
- Operational overhead (N services to deploy)

## Implementation
- Service discovery via Kubernetes DNS
- API Gateway (Nginx/Kong) for routing
- Circuit breakers for resilience
- Observability via OpenTelemetry

## Related
- ADR-001: Event-Driven Architecture
- ADR-003: Containerization & K8s
