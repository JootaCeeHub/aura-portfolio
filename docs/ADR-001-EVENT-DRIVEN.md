# ADR-001: Event-Driven Architecture for Microservices

## Status
Accepted

## Context
AURA needed to scale horizontally with loosely coupled services. Tightly coupled architectures would become bottlenecks.

## Decision
Adopted event-driven architecture with:
- EventBus (pub/sub) as central coordinator
- DomainEvents for cross-service communication
- Event sourcing for auditability and replay

## Consequences

### Positive
- Services completely decoupled
- Easy to add new consumers (Logger, MetricsCollector, UI)
- Natural support for event replay
- Excellent for debugging (full event log)

### Negative
- Eventual consistency (no ACID guarantees)
- Operational complexity (need message queue in prod: RabbitMQ/Kafka)
- Harder to debug (async flows)

## Implementation
- EventBus in `src/lib/eventBus.ts`
- AgentCoordinator publishes: AgentExecutionStarted/Completed/Failed
- Logger, MetricsCollector, UI subscribe independently

## Related
- ADR-002: Microservices Separation
- ADR-003: Persistence Layer
