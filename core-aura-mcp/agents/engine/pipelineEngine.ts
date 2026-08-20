/**
 * PipelineEngine.ts — AURA-MCP (Versión Enterprise 2025)
 * ================================================================================
 * Motor cognitivo jerárquico con integración completa:
 *
 *   ✔ LangChain (react, plan-and-execute, router)
 *   ✔ LangGraph (flujos condicionales + async)
 *   ✔ MCP Tools (locales + remotas)
 *   ✔ RAG (Supabase / Graphiti / LightRAG)
 *   ✔ ContextEngine (memoria contextual inteligente)
 *   ✔ OrchestratorCore (routing cognitivo)
 *
 * Fallback inteligente:
 *   1. Agente principal (LangChain ReAct)
 *   2. Backup por rol
 *   3. LangGraph Plan/Workflow
 *   4. Modelo alternativo (OpenAI gpt-4o-mini)
 *   5. Modelo económico/local (llama3, mistral, groq)
 *   6. Persona-JC (último recurso)
 */

import { Logger } from '../lib/logger.js';
import { Metrics } from '../lib/metrics.js';

import { Sanitizer } from '../utils/sanitizer.js';
import { LangChainExecutor } from './langchainExecutor.js';

import { AgentManager } from './agentManager.js';
import { OrchestratorCore } from './orchestratorCore.js';

import { ContextEngine } from '../context/contextEngine.js';
import { RAGEngine } from '../rag/ragEngine.js';
import { Config } from '../lib/config.js';

export class PipelineEngine {
  /**
   * Ejecuta un pipeline cognitivo de extremo a extremo.
   */
  static async run(agentName: string, input: string, context: any = {}) {
    const cleanInput = Sanitizer.clean(input);

    Logger.info('[PipelineEngine] Inicio del pipeline cognitivo', {
      agent: agentName,
      input_preview: cleanInput.slice(0, 200),
    });

    Metrics.countPipeline?.();

    // ==========================
    // 0. Contexto previo (RAG + Memory)
    // ==========================
    try {
      const enriched = await ContextEngine.enrich(cleanInput, context);
      context = { ...context, ...enriched };

      const retrieved = await RAGEngine.retrieve(cleanInput);
      context.rag_sources = retrieved?.sources || [];

      Logger.info('[PipelineEngine] Contexto enriquecido (RAG + memory)');
    } catch (errCE: any) {
      Logger.warn('[PipelineEngine] Warning al enriquecer contexto', {
        error: errCE.message,
      });
    }

    // ==========================
    // 1. ORCHESTRATOR (router cognitivo)
    // ==========================
    try {
      const routedAgent = await OrchestratorCore.route(agentName, cleanInput, context);

      if (routedAgent && routedAgent !== agentName) {
        Logger.info('[PipelineEngine] Orchestrator re-ruteó el agente', {
          from: agentName,
          to: routedAgent,
        });
        agentName = routedAgent;
      }
    } catch (errOR: any) {
      Logger.error('[PipelineEngine] Error en OrchestratorCore', {
        error: errOR.message,
      });
    }

    // ==========================
    // 2. ETAPA PRINCIPAL — LANGCHAIN EXECUTOR
    // ==========================
    try {
      const primary = await LangChainExecutor.runAgent(agentName, cleanInput, context);

      return {
        stage: 'primary-agent',
        agent: agentName,
        score: this.scoreOutput(primary),
        result: primary,
      };
    } catch (err1: any) {
      Metrics.countError?.();
      Logger.error('[PipelineEngine] Error en etapa primaria', {
        agent: agentName,
        error: err1.message,
      });
    }

    // ==========================
    // 3. ETAPA ROLE-BACKUP
    // ==========================
    try {
      const main = AgentManager.get(agentName);
      const backups = AgentManager.findByRole(main.role);

      const candidate = backups.find((x) => x.name !== agentName);

      if (candidate) {
        Logger.warn('[PipelineEngine] Usando agente backup por rol', {
          backup: candidate.name,
        });

        const secondary = await LangChainExecutor.runAgent(candidate.name, cleanInput, context);

        return {
          stage: 'role-backup',
          agent: candidate.name,
          score: this.scoreOutput(secondary),
          result: secondary,
        };
      }
    } catch (err2: any) {
      Logger.error('[PipelineEngine] Error en role-backup', {
        error: err2.message,
      });
    }

    // ==========================
    // 4. ETAPA LANGGRAPH (workflow avanzado)
    // ==========================
    try {
      if (Config.enableLangGraph) {
        Logger.warn('[PipelineEngine] Activando flujo LangGraph...');

        const output = await global.LANGGRAPH_ENGINE.runWorkflow({
          input: cleanInput,
          context,
        });

        return {
          stage: 'langgraph',
          workflow: Config.defaultGraph || 'default',
          score: this.scoreOutput(output),
          result: output,
        };
      }
    } catch (errLG: any) {
      Logger.error('[PipelineEngine] Error en LangGraph', {
        error: errLG.message,
      });
    }

    // ==========================
    // 5. FALLBACK — MODELO MINI
    // ==========================
    try {
      Logger.warn('[PipelineEngine] Fallback → modelo mini');

      const mini = await global.AURA_MODEL.invoke({
        model: Config.fallbackModel || 'gpt-4o-mini',
        prompt: cleanInput,
        context,
      });

      return {
        stage: 'fallback-model',
        model: Config.fallbackModel,
        score: this.scoreOutput(mini),
        result: mini,
      };
    } catch (err3: any) {
      Logger.error('[PipelineEngine] Fallback → modelo mini falló', {
        error: err3.message,
      });
    }

    // ==========================
    // 6. FALLBACK — MODELO LOCAL (Llama/Mistral/Groq)
    // ==========================
    try {
      Logger.warn('[PipelineEngine] Fallback → modelo local económico');

      const local = await global.AURA_MODEL.invoke({
        model: Config.localModel || 'llama3',
        prompt: cleanInput,
        context,
      });

      return {
        stage: 'local-model',
        model: Config.localModel || 'llama3',
        score: this.scoreOutput(local),
        result: local,
      };
    } catch (err4: any) {
      Logger.error('[PipelineEngine] Modelo local falló', {
        error: err4.message,
      });
    }

    // ==========================
    // 7. PERSONA-JC (último recurso)
    // ==========================
    try {
      const fallback = AgentManager.exists('persona_jc') ? 'persona_jc' : agentName;

      Logger.warn('[PipelineEngine] Activando fallback Persona-JC');

      const persona = await LangChainExecutor.runAgent(fallback, cleanInput, context);

      return {
        stage: 'persona-fallback',
        agent: fallback,
        score: this.scoreOutput(persona),
        result: persona,
      };
    } catch (err5: any) {
      Logger.error('[PipelineEngine] Persona fallback falló', {
        error: err5.message,
      });
    }

    // ==========================
    // 8. CRITICAL FAILURE
    // ==========================
    Logger.critical('[PipelineEngine] Falla total del pipeline');

    return {
      stage: 'critical-failure',
      error: 'El pipeline cognitivo falló en todas sus etapas.',
    };
  }

  // =========================================================================
  // SCORING DE CALIDAD DEL OUTPUT (Heurístico AURA)
  // =========================================================================
  private static scoreOutput(output: any): number {
    if (!output) return 0;

    const text = JSON.stringify(output);

    let score = 0;

    if (text.length > 50) score += 20;
    if (text.length > 150) score += 20;
    if (text.includes('.')) score += 20;
    if (/\n|:|-/.test(text)) score += 20;

    return Math.min(score, 100);
  }
}
