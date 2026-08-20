# Contributing to AURA

## Getting Started

### 1. Setup Desarrollo Local

```bash
# Clone
git clone https://github.com/aura-project/aura-mcp.git
cd aura-mcp

# Install
npm install

# Setup env
cp .env.example .env
echo "JWT_SECRET=$(openssl rand -base64 32)" >> .env

# Start dev
npm run dev
```

### 2. Crear Agente Simple

```bash
aura generate:agent --name hello_world --type simple
```

### 3. Ejecutar Tests

```bash
npm test
npm run test:coverage
```

## Code Style

- **TypeScript**: Strict mode enabled
- **Prettier**: Auto-format on save
- **ESLint**: Enforce rules
- **Imports**: Use absolute paths (@lib, @core, @components)

## Commit Convention

```
feat: descripción breve
fix: descripción breve
docs: descripción breve
test: descripción breve
refactor: descripción breve
chore: descripción breve
```

## PR Process

1. Fork repo
2. Create feature branch: `git checkout -b feat/my-feature`
3. Commit changes: `git commit -m "feat: descripción"`
4. Push: `git push origin feat/my-feature`
5. Open PR con descripción clara

## Testing Requirements

- Unit tests: Cobertura > 80%
- Integration tests: Para cambios en API
- E2E tests: Para cambios en flujos críticos

## Documentation

- Actualizar README si cambias comportamiento
- Crear ADR si cambias decisión arquitectónica
- Añadir ejemplos en `/examples` si añades feature nueva

## Questions?

- Issues: Reporting bugs o features
- Discussions: Preguntas generales
- Docs: Guías en `/docs`

---

**Code of Conduct**: Sé respetuoso, constructivo, inclusivo.
