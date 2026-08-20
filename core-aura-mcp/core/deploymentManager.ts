/**
 * deploymentManager.ts — AURA-MCP
 * ================================================================================
 * Gestor de entornos y despliegue para módulos MCP+IA.
 *
 * Alineado con la Plantilla MCP IA Modular:
 *  - Entornos: local, dev, staging, prod
 *  - Versionado por entorno
 *  - CI/CD por módulo
 *  - Estrategias de despliegue (blue/green, rolling, simple, canary)
 *
 * Este módulo NO ejecuta el despliegue físico (docker, k8s, etc.),
 * sino que:
 *   ✔ Modela los targets y entornos
 *   ✔ Mantiene qué versión está desplegada en cada entorno
 *   ✔ Genera planes de despliegue
 *   ✔ Registra estado de despliegue, health y metadatos de CI/CD
 */

import { Logger } from '../src/lib/logger.js';
import ModuleRegistry, { ModuleRecord } from './moduleRegistry.js';

// =============================================================================
// 1. ENUMS Y TIPOS BÁSICOS
// =============================================================================

export type EnvStage = 'local' | 'dev' | 'staging' | 'prod';

export const EnvStageOrder: EnvStage[] = ['local', 'dev', 'staging', 'prod'];

export type DeployStrategy = 'simple' | 'blue_green' | 'rolling' | 'canary';

export type DeployStatus = 'pending' | 'in_progress' | 'success' | 'failed' | 'cancelled';

export interface DeploymentTarget {
  id: string; // id interno: prod-main, staging-eu, etc.
  name: string; // nombre humano
  env: EnvStage;
  baseUrl?: string; // URL pública o base
  description?: string;
  isDefault?: boolean;
  tags?: string[]; // ej: ["aura-core", "latam", "critical"]
  ciPipelineUrl?: string; // URL a la pipeline de CI/CD
  infra?: string; // docker, k8s, vm, serverless, etc.
  lastHealthStatus?: 'unknown' | 'healthy' | 'degraded' | 'down';
  lastDeployedAt?: string;
  lastDeployedVersion?: string | null; // versionId del módulo principal, si aplica
}

// Registro de qué módulo está desplegado en qué entorno/target
export interface ModuleDeploymentRecord {
  moduleId: string;
  versionId: string;
  env: EnvStage;
  targetId: string;
  status: DeployStatus;
  strategy: DeployStrategy;
  deployedAt: string;
  deployedBy?: string;
  notes?: string;
}

// Plan de despliegue calculado antes de ejecutar
export interface DeployPlan {
  moduleId: string;
  versionId: string;
  env: EnvStage;
  target: DeploymentTarget;
  strategy: DeployStrategy;
  steps: string[];
  risks: string[];
  preChecks: string[];
  postChecks: string[];
}

// =============================================================================
// 2. GESTOR PRINCIPAL
// =============================================================================

class DeploymentManagerCore {
  private targets: Map<string, DeploymentTarget> = new Map();
  private deployments: ModuleDeploymentRecord[] = [];

  // -------------------------------------------------------------------------
  // CONFIG / INIT
  // -------------------------------------------------------------------------

  bootstrapDefaultTargets() {
    // Targets de ejemplo; puedes ajustarlos a tu realidad
    this.registerTarget({
      id: 'local-core',
      name: 'Local Core AURA',
      env: 'local',
      baseUrl: 'http://localhost:3000',
      description: 'Entorno de desarrollo local de AURA.',
      isDefault: true,
      tags: ['aura-core', 'local'],
      infra: 'docker',
      lastHealthStatus: 'unknown',
      lastDeployedVersion: null,
    });

    this.registerTarget({
      id: 'dev-core',
      name: 'Dev AURA Core',
      env: 'dev',
      baseUrl: 'https://dev-aura-core.yourdomain.com',
      description: 'Entorno de integración / pruebas internas.',
      tags: ['aura-core', 'dev'],
      infra: 'docker',
      lastHealthStatus: 'unknown',
      lastDeployedVersion: null,
    });

    this.registerTarget({
      id: 'staging-core',
      name: 'Staging AURA Core',
      env: 'staging',
      baseUrl: 'https://staging-aura-core.yourdomain.com',
      description: 'Entorno Pre-Producción.',
      tags: ['aura-core', 'staging'],
      infra: 'kubernetes',
      lastHealthStatus: 'unknown',
      lastDeployedVersion: null,
    });

    this.registerTarget({
      id: 'prod-core',
      name: 'Prod AURA Core',
      env: 'prod',
      baseUrl: 'https://aura-core.yourdomain.com',
      description: 'Entorno de Producción.',
      tags: ['aura-core', 'prod', 'critical'],
      infra: 'kubernetes',
      lastHealthStatus: 'unknown',
      lastDeployedVersion: null,
    });

    Logger.info('[DeploymentManager] Targets default inicializados.');
  }

  // -------------------------------------------------------------------------
  // TARGETS
  // -------------------------------------------------------------------------

  registerTarget(target: DeploymentTarget): DeploymentTarget {
    this.targets.set(target.id, target);
    Logger.info('[DeploymentManager] Target registrado/actualizado', target);
    return target;
  }

  getTarget(targetId: string): DeploymentTarget | undefined {
    return this.targets.get(targetId);
  }

  listTargets(env?: EnvStage): DeploymentTarget[] {
    const all = Array.from(this.targets.values());
    return env ? all.filter((t) => t.env === env) : all;
  }

  getDefaultTarget(env: EnvStage): DeploymentTarget | undefined {
    const envTargets = this.listTargets(env);
    const explicitDefault = envTargets.find((t) => t.isDefault);
    return explicitDefault || envTargets[0];
  }

  // -------------------------------------------------------------------------
  // PLANIFICACIÓN DE DESPLIEGUE
  // -------------------------------------------------------------------------

  createDeployPlan(params: {
    moduleId: string;
    versionId?: string;
    env: EnvStage;
    targetId?: string;
    strategy?: DeployStrategy;
  }): DeployPlan | null {
    const { moduleId, env } = params;
    const versionId = params.versionId || 'default';
    const strategy: DeployStrategy = params.strategy || 'simple';

    // 1. Verificar que el módulo existe en el registry
    const moduleRec: ModuleRecord | undefined = ModuleRegistry.get(moduleId, versionId);

    if (!moduleRec) {
      Logger.error('[DeploymentManager] Módulo no encontrado para despliegue', {
        moduleId,
        versionId,
      });
      return null;
    }

    // 2. Resolver target
    let target: DeploymentTarget | undefined;

    if (params.targetId) {
      target = this.getTarget(params.targetId);
    } else {
      target = this.getDefaultTarget(env);
    }

    if (!target) {
      Logger.error('[DeploymentManager] No existe target para el entorno', {
        env,
      });
      return null;
    }

    // 3. Construir plan de despliegue
    const steps: string[] = [];
    const risks: string[] = [];
    const preChecks: string[] = [];
    const postChecks: string[] = [];

    preChecks.push(
      'Verificar que el módulo pasa validación de blueprint.',
      'Revisar compatibilidad de versión (breaking changes).',
      'Confirmar que no hay despliegues simultáneos en el mismo target.'
    );

    // Estrategia específica
    switch (strategy) {
      case 'simple':
        steps.push(
          'Construir imagen / artefacto del módulo.',
          `Desplegar versión ${versionId} en target ${target.id}.`,
          'Actualizar registros de ModuleRegistry / DeploymentManager.'
        );
        risks.push('Interrupción breve posible.', 'Rollback manual si no se automatiza.');
        break;

      case 'blue_green':
        steps.push(
          'Desplegar nueva versión en stack paralelo (green).',
          'Ejecutar smoke tests y pruebas de regresión en green.',
          'Cambiar tráfico gradualmente de blue → green.',
          'Desmantelar stack antiguo (blue) una vez estable.'
        );
        risks.push(
          'Mayor consumo de recursos durante despliegue.',
          'Complejidad en manejo de tráfico y monitoreo.'
        );
        break;

      case 'rolling':
        steps.push(
          'Actualizar pods/instancias en batches pequeños.',
          'Monitorear health tras cada batch.',
          'Completar cuando el 100% de instancias estén en nueva versión.'
        );
        risks.push(
          'Puede ser más lento completar despliegue.',
          'Riesgo de estados mixtos si falla a mitad de camino.'
        );
        break;

      case 'canary':
        steps.push(
          'Desplegar nueva versión a una fracción pequeña de tráfico.',
          'Monitorear métricas clave (errores, latencia, negocio).',
          'Aumentar gradualmente el porcentaje de tráfico.',
          'Promocionar a full o hacer rollback según resultados.'
        );
        risks.push(
          'Requiere infraestructura de routing avanzada.',
          'Necesita métricas claras para decisión de promoción.'
        );
        break;
    }

    postChecks.push(
      'Verificar logs y métricas de error.',
      'Confirmar integración con módulos dependientes.',
      'Notificar al responsable del despliegue / canal de alerta.'
    );

    const plan: DeployPlan = {
      moduleId,
      versionId,
      env,
      target,
      strategy,
      steps,
      risks,
      preChecks,
      postChecks,
    };

    Logger.info('[DeploymentManager] Plan de despliegue generado', plan);

    return plan;
  }

  // -------------------------------------------------------------------------
  // REGISTRAR DESPLIEGUE COMPLETADO / FALLIDO
  // -------------------------------------------------------------------------

  registerDeployment(result: {
    moduleId: string;
    versionId: string;
    env: EnvStage;
    targetId: string;
    status: DeployStatus;
    strategy: DeployStrategy;
    deployedBy?: string;
    notes?: string;
  }): ModuleDeploymentRecord {
    const record: ModuleDeploymentRecord = {
      moduleId: result.moduleId,
      versionId: result.versionId,
      env: result.env,
      targetId: result.targetId,
      status: result.status,
      strategy: result.strategy,
      deployedAt: new Date().toISOString(),
      deployedBy: result.deployedBy,
      notes: result.notes,
    };

    this.deployments.push(record);

    // Actualizar metadata en el target
    const target = this.targets.get(result.targetId);
    if (target) {
      target.lastDeployedAt = record.deployedAt;
      if (result.status === 'success') {
        target.lastDeployedVersion = result.versionId;
        target.lastHealthStatus = 'healthy';
      } else if (result.status === 'failed') {
        target.lastHealthStatus = 'degraded';
      }
      this.targets.set(target.id, target);
    }

    Logger.info('[DeploymentManager] Registro de despliegue actualizado', record);

    return record;
  }

  // -------------------------------------------------------------------------
  // CONSULTAS
  // -------------------------------------------------------------------------

  getDeploymentsForModule(moduleId: string, env?: EnvStage): ModuleDeploymentRecord[] {
    return this.deployments.filter((d) => d.moduleId === moduleId && (!env || d.env === env));
  }

  getCurrentVersionForModule(moduleId: string, env: EnvStage): string | null {
    const envDeploys = this.deployments
      .filter((d) => d.moduleId === moduleId && d.env === env)
      .sort((a, b) => (a.deployedAt > b.deployedAt ? -1 : 1));

    const lastSuccess = envDeploys.find((d) => d.status === 'success');
    return lastSuccess ? lastSuccess.versionId : null;
  }

  listDeployments(): ModuleDeploymentRecord[] {
    return [...this.deployments];
  }

  // Snapshot de estado útil para dashboards de observabilidad
  snapshot() {
    return {
      targets: Array.from(this.targets.values()),
      deployments: this.deployments,
    };
  }
}

// =============================================================================
// 3. SINGLETON EXPORTADO
// =============================================================================

export const DeploymentManager = new DeploymentManagerCore();

// Inicializa targets default
DeploymentManager.bootstrapDefaultTargets();

export default DeploymentManager;
