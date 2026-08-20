export interface AgentRoleDetail {
  id: string;
  label: string;
  icon: string;
  description: string;
  capabilities: string[];
  focus: string;
  complexity: 'low' | 'medium' | 'high';
  use_cases: string[];
  limitations: string[];
  requires_approval: boolean;
  autonomy_level: 'restricted' | 'moderate' | 'full';
  color: string;
}

export const AGENT_ROLES_DETAILED: AgentRoleDetail[] = [
  {
    id: 'orchestrator',
    label: 'Orquestador Cognitivo',
    icon: '🎼',
    description:
      'Coordinador central del sistema. Gestiona flujos, prioridades y decisiones sistémicas. Lidera la orquestación de otros agentes.',
    capabilities: [
      'Coordinación de flujos multi-agente',
      'Priorización inteligente de tareas',
      'Toma de decisiones estratégicas',
      'Supervisión de ejecución',
      'Rebalanceo de cargas',
    ],
    focus: 'Coordinación y flujo sistémico',
    complexity: 'high',
    use_cases: [
      'Automatización compleja multi-paso',
      'Sistemas de IA distribuidos',
      'Flujos empresariales críticos',
      'Toma de decisiones ejecutivas',
    ],
    limitations: [
      'Requiere definición clara de flujos',
      'Alto costo computacional',
      'Necesita supervisión periódica',
    ],
    requires_approval: true,
    autonomy_level: 'moderate',
    color: '#00E5FF',
  },

  {
    id: 'analyst',
    label: 'Asistente de Análisis',
    icon: '📊',
    description:
      'Especialista en procesamiento de datos. Analiza información, extrae patrones y genera insights. Ideal para business intelligence.',
    capabilities: [
      'Análisis estadístico avanzado',
      'Detección de patrones',
      'Extracción de insights',
      'Generación de reportes',
      'Visualización de datos',
    ],
    focus: 'Análisis cuantitativo y cualitativo',
    complexity: 'medium',
    use_cases: [
      'Business Intelligence',
      'Análisis de mercado',
      'Investigación cuantitativa',
      'Reporting automático',
      'Detección de anomalías',
    ],
    limitations: [
      'Depende de calidad de datos',
      'Lento en grandes volúmenes',
      'Requiere contexto empresarial',
    ],
    requires_approval: false,
    autonomy_level: 'moderate',
    color: '#4FC3F7',
  },

  {
    id: 'decision_engine',
    label: 'Motor de Decisiones',
    icon: '⚡',
    description:
      'Toma decisiones rápidas basadas en reglas y ML. Optimiza para velocidad y consistencia. Ideal para sistemas en tiempo real.',
    capabilities: [
      'Toma de decisiones real-time',
      'Aplicación de reglas de negocio',
      'Scoring y ranking',
      'A/B testing automático',
      'Optimización de resultados',
    ],
    focus: 'Decisiones rápidas y optimizadas',
    complexity: 'medium',
    use_cases: [
      'Sistemas de recomendación',
      'Trading automático',
      'Routing inteligente',
      'Scoring de clientes',
      'Optimización de recursos',
    ],
    limitations: [
      'Requiere datos limpios',
      'Decisiones binarias/categóricas',
      'Dificultad con contexto complejo',
    ],
    requires_approval: false,
    autonomy_level: 'full',
    color: '#FFB74D',
  },

  {
    id: 'quality_supervisor',
    label: 'Supervisor de Calidad',
    icon: '✅',
    description:
      'Valida, audita y asegura estándares. Revisa salidas de otros agentes y garantiza cumplimiento normativo.',
    capabilities: [
      'Validación de calidad',
      'Auditoría de procesos',
      'Cumplimiento normativo',
      'Testing automático',
      'Detección de errores',
    ],
    focus: 'Control de calidad y compliance',
    complexity: 'medium',
    use_cases: [
      'Aseguramiento de calidad',
      'Auditoría automática',
      'Compliance regulatorio',
      'Testing de sistemas',
      'Detección de fraude',
    ],
    limitations: [
      'Solo detecta, no corrige',
      'Falsos positivos posibles',
      'Requiere benchmark claro',
    ],
    requires_approval: true,
    autonomy_level: 'restricted',
    color: '#81C784',
  },

  {
    id: 'researcher',
    label: 'Investigador Especializado',
    icon: '🔬',
    description:
      'Realiza investigación profunda, síntesis de información y generación de conocimiento. Ideal para R&D y aprendizaje.',
    capabilities: [
      'Búsqueda web avanzada',
      'Síntesis de información',
      'Generación de reportes técnicos',
      'Análisis de literatura',
      'Validación de fuentes',
    ],
    focus: 'Investigación y síntesis de conocimiento',
    complexity: 'medium',
    use_cases: [
      'Investigación de mercado',
      'Due diligence',
      'Análisis competitivo',
      'Investigación académica',
      'Síntesis de tendencias',
    ],
    limitations: [
      'Dependencia de acceso web',
      'Lento para grandes volúmenes',
      'Riesgo de alucinaciones',
    ],
    requires_approval: false,
    autonomy_level: 'moderate',
    color: '#AB47BC',
  },

  {
    id: 'developer',
    label: 'Agente Desarrollador',
    icon: '💻',
    description:
      'Genera y refactoriza código. Resuelve problemas técnicos y automatiza desarrollo. Requiere revisión de código.',
    capabilities: [
      'Generación de código',
      'Refactorización inteligente',
      'Debugging automático',
      'Documentación de código',
      'Testing unitario',
    ],
    focus: 'Desarrollo y mantenimiento de software',
    complexity: 'high',
    use_cases: [
      'Automatización de desarrollo',
      'Debugging asistido',
      'Refactorización de código legacy',
      'Generación de documentación',
      'Code review automático',
    ],
    limitations: [
      'Requiere revisión humana obligatoria',
      'Limitado a patrones conocidos',
      'Debugging complejo requiere intervención',
    ],
    requires_approval: true,
    autonomy_level: 'restricted',
    color: '#29B6F6',
  },

  {
    id: 'content_architect',
    label: 'Arquitecto de Contenido',
    icon: '📝',
    description:
      'Crea, estructura y optimiza contenido. Ideal para marketing, documentación y comunicación estratégica.',
    capabilities: [
      'Creación de contenido diverso',
      'Optimización SEO',
      'Estructura de narrativas',
      'Copywriting persuasivo',
      'Adaptación de tonos',
    ],
    focus: 'Creación y optimización de contenido',
    complexity: 'medium',
    use_cases: [
      'Marketing content',
      'Documentación técnica',
      'Copywriting',
      'SEO optimization',
      'Social media management',
    ],
    limitations: [
      'Requiere contexto de marca',
      'Puede ser repetitivo',
      'Necesita validación editorial',
    ],
    requires_approval: false,
    autonomy_level: 'moderate',
    color: '#EF9A9A',
  },

  {
    id: 'security_guardian',
    label: 'Guardián de Seguridad',
    icon: '🛡️',
    description:
      'Monitorea seguridad, detecta vulnerabilidades y aplica medidas defensivas. Rol crítico para protección de sistemas.',
    capabilities: [
      'Detección de amenazas',
      'Análisis de vulnerabilidades',
      'Respuesta a incidentes',
      'Monitoreo de seguridad',
      'Validación de permisos',
    ],
    focus: 'Seguridad y protección de sistemas',
    complexity: 'high',
    use_cases: [
      'Monitoreo de seguridad 24/7',
      'Pentesting automático',
      'Detección de anomalías',
      'Respuesta a incidentes',
      'Cumplimiento de políticas de seguridad',
    ],
    limitations: [
      'Requiere actualización constante',
      'Falsos positivos pueden ser frecuentes',
      'Necesita integración con sistemas',
    ],
    requires_approval: true,
    autonomy_level: 'full',
    color: '#FF5252',
  },

  {
    id: 'market_scout',
    label: 'Explorador de Mercado',
    icon: '🔍',
    description:
      'Monitorea tendencias, competencia y oportunidades. Ideal para estrategia empresarial y decisiones comerciales.',
    capabilities: [
      'Monitoreo de tendencias',
      'Análisis competitivo',
      'Identificación de oportunidades',
      'Seguimiento de noticias',
      'Alertas de cambios de mercado',
    ],
    focus: 'Inteligencia de mercado',
    complexity: 'medium',
    use_cases: [
      'Estrategia de negocio',
      'Identificación de oportunidades',
      'Análisis competitivo',
      'Market research',
      'Due diligence',
    ],
    limitations: [
      'Dependencia de fuentes públicas',
      'Lag de información',
      'Requiere contexto de industria',
    ],
    requires_approval: false,
    autonomy_level: 'moderate',
    color: '#66BB6A',
  },

  {
    id: 'ethical_navigator',
    label: 'Navegador Ético',
    icon: '⚖️',
    description:
      'Evalúa implicaciones éticas, legales y sociales. Asegura decisiones alineadas con valores y normativas.',
    capabilities: [
      'Análisis ético',
      'Evaluación de impacto social',
      'Validación legal',
      'Detección de sesgos',
      'Recomendaciones de mitigación',
    ],
    focus: 'Ética, legalidad y responsabilidad',
    complexity: 'high',
    use_cases: [
      'Evaluación de impacto social',
      'Compliance regulatorio',
      'Auditoría ética de decisiones',
      'Detección de sesgos en IA',
      'Asesoría legal pre-decisión',
    ],
    limitations: [
      'Evaluaciones subjetivas',
      'Requiere expertise legal',
      'Contexto culturalmente dependiente',
    ],
    requires_approval: true,
    autonomy_level: 'moderate',
    color: '#BA68C8',
  },

  {
    id: 'automation_hub',
    label: 'Centro de Automatización',
    icon: '⚙️',
    description:
      'Automatiza flujos repetitivos mediante integraciones. Conecta sistemas y orquesta procesos RPA.',
    capabilities: [
      'Integración de sistemas',
      'Automatización RPA',
      'Orquestación de workflows',
      'Sincronización de datos',
      'Monitoreo de procesos',
    ],
    focus: 'Automatización de procesos',
    complexity: 'high',
    use_cases: [
      'Automatización RPA',
      'Integración de sistemas',
      'Sincronización de datos',
      'Orquestación de workflows complejos',
      'Monitoreo de procesos críticos',
    ],
    limitations: [
      'Requiere configuración inicial compleja',
      'Mantenimiento constante',
      'Dependencia de APIs estables',
    ],
    requires_approval: true,
    autonomy_level: 'full',
    color: '#FFA726',
  },
];

export function getRoleById(id: string): AgentRoleDetail | undefined {
  return AGENT_ROLES_DETAILED.find((role) => role.id === id);
}

export function getAllRoles(): AgentRoleDetail[] {
  return AGENT_ROLES_DETAILED;
}
