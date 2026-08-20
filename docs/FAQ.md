# Frequently Asked Questions

## Installation & Setup

**Q: Node version requirement?**
A: Node 18+ with npm 8+

**Q: Windows support?**
A: Sí, pero recomendamos WSL2 para mejor experience.

**Q: Can I use Python?**
A: Agentes son TypeScript/JavaScript, pero puedes llamar scripts Python via tools.

## Agentes

**Q: ¿Cuál es la diferencia entre templates?**
A:
- `simple`: Sin LLM, lógica pura
- `llm`: Requiere LLM (Claude, GPT, etc)
- `reactive`: Event-driven, escucha EventBus

**Q: ¿Puedo compartir código entre agentes?**
A: Sí, crear utilidades en `src/utils/` e importar.

**Q: ¿Máximo número de agentes?**
A: Sin límite teórico, pero escalabilidad depende de recursos (CPU, memoria).

## Development

**Q: ¿Cómo hago HMR (Hot Module Reload)?**
A: Ejecutar `aura dev` y cambiar archivos. Detecta automáticamente.

**Q: ¿Cómo debugg con breakpoints?**
A: Usar `aura debug` y conectar DevTools o VSCode.

**Q: ¿Puedo usar ambiente de producción localmente?**
A: Sí, con Docker Compose: `docker-compose up`

## Testing

**Q: ¿Qué framework usar?**
A: Vitest (pre-configurado).

**Q: ¿Coverage requirement?**
A: Mínimo 80% para CI/CD.

**Q: ¿Cómo mockear agentes?**
A: Usar `mockAgent()` helper en tests.

## Deployment

**Q: ¿Qué plataforma para producción?**
A: Kubernetes recomendado. También Heroku, Railway, AWS ECS.

**Q: ¿Cómo backups?**
A: PostgreSQL backups diarios a S3/Google Cloud Storage.

**Q: ¿Cómo updates sin downtime?**
A: Rolling updates en K8s + health checks.

## Troubleshooting

**Q: "Port 3000 already in use"**
A: `lsof -i :3000` y matar proceso, o `aura dev --port 3001`

**Q: "JWT_SECRET not configured"**
A: Ver `.env.example` y configurar `JWT_SECRET`

**Q: "WebSocket connection failed"**
A: Verificar firewall, CORS, endpoint URL

**Q: Tests muy lentos**
A: Usar `--run` flag para evitar watch mode, paralelizar con `--threads`

## Performance

**Q: Cómo optimizar latencia?**
A:
- Cache en Redis
- Índices en PostgreSQL
- Replica agentes frecuentes
- Reduce prompts size

**Q: Cómo escalar?**
A: HPA en K8s automático, o manual con `kubectl scale`

---

**Still stuck?** Open [GitHub Issue](https://github.com/aura-project/aura-mcp/issues) con detalles.
