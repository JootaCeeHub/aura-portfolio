export const AGENT_ROLES = [
  'orchestrator_core',
  'content_architect',
  'ethical_hacking',
  'guardian',
  'memory_architect',
  'no_limits',
  'opportunity_engine',
  'persona',
  'rag',
  'rrss',
  'trading',
  'visualization_ux',
  'seo',
  'research',
  'paradigm_shift',
  'market_scout',
  'exec_planner',
  'deep_research',
  'developer',
  'business',
  'architecture_sage',
  'analyst',
];

export const AGENT_TOOLS = [
  'power_automate',
  'risk_oracle',
  'web_scraping',
  'python',
  'excel',
  'data_quality',
  'client_success',
  'automation',
  'n8n',
  'mql5',
  'testing_qa',
  'cost_optimizer',
];

export const DOC_SECTIONS = [
  { id: 'getting-started', title: 'Getting Started', icon: '🚀' },
  { id: 'architecture', title: 'Architecture', icon: '🏗️' },
  { id: 'agents', title: 'Agents Guide', icon: '🤖' },
  { id: 'tools', title: 'Tools Reference', icon: '🛠️' },
  { id: 'integrations', title: 'Integrations', icon: '🔌' },
  { id: 'api', title: 'API Reference', icon: '📡' },
];

export const AGENTS_DATA = [
  {
    name: 'orchestrator_core',
    role: 'Orquestador Principal',
    description: 'Coordina la ejecución de múltiples agentes y gestiona el flujo de trabajo global',
  },
  {
    name: 'content_architect',
    role: 'Arquitecto de Contenido',
    description: 'Diseña y estructura contenido de alta calidad para diversos formatos',
  },
  {
    name: 'ethical_hacking',
    role: 'Seguridad Ética',
    description: 'Analiza vulnerabilidades y propone soluciones de seguridad',
  },
  {
    name: 'guardian',
    role: 'Guardián de Calidad',
    description: 'Valida outputs y asegura cumplimiento de estándares',
  },
  {
    name: 'memory_architect',
    role: 'Arquitecto de Memoria',
    description: 'Gestiona el almacenamiento y recuperación de información contextual',
  },
  {
    name: 'rag',
    role: 'RAG Specialist',
    description: 'Retrieval-Augmented Generation para búsqueda y síntesis de información',
  },
  {
    name: 'research',
    role: 'Investigador',
    description: 'Realiza investigación profunda usando múltiples fuentes',
  },
  {
    name: 'developer',
    role: 'Desarrollador',
    description: 'Genera y optimiza código en múltiples lenguajes',
  },
  { name: 'analyst', role: 'Analista de Datos', description: 'Procesa y analiza datos complejos' },
  {
    name: 'business',
    role: 'Estratega de Negocios',
    description: 'Análisis de mercado y estrategias empresariales',
  },
];

export const TOOLS_DATA = [
  {
    category: 'Observability',
    tools: ['core.get_status', 'core.list_servers'],
    description: 'Monitoreo del estado del sistema',
  },
  {
    category: 'Routing',
    tools: ['core.route_tool', 'core.route_intent'],
    description: 'Enrutamiento de herramientas e intenciones',
  },
  {
    category: 'Repository',
    tools: ['core.repo.snapshot', 'core.repo.get_prompt'],
    description: 'Gestión de prompts, templates y knowledge',
  },
  {
    category: 'SQL Tools',
    tools: ['core.sql.query', 'core.sql.select', 'core.sql.write'],
    description: 'Operaciones de base de datos',
  },
  {
    category: 'Agent Management',
    tools: ['core.agent.list', 'core.agent.create', 'core.agent.invoke'],
    description: 'Gestión y ejecución de agentes',
  },
  {
    category: 'Automation Hub',
    tools: ['core.automation.n8n.*', 'core.automation.make.*'],
    description: 'Integración con plataformas de automatización',
  },
];
