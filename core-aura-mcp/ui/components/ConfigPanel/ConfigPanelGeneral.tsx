import React, { useState, useEffect, useMemo } from 'react';
import { ConfigTooltip } from './ConfigTooltip';
import { ConfigSlider } from './ConfigSlider';
import { ConfigToggle } from './ConfigToggle';
import { RoleSelector } from './RoleSelector';
import { Button } from '../ui';
import { configService, type GeneralConfig } from '../../services/configService';
import { getRoleById, type AgentRoleDetail } from '../../services/agentRolesService';
import { RoleAdvancedPanel } from './RoleAdvancedPanel';

interface ConfigPanelGeneralProps {
  onSave?: (config: GeneralConfig) => void;
}

const DEFAULT_CONFIG: GeneralConfig = {
  agentName: 'AURA Orchestrator',
  agentDescription: 'Sistema cognitivo distribuido para orquestación inteligente',
  agentRole: 'Orquestador Cognitivo',
  agentAvatarUrl: '',
  executionMode: 'supervised',
  cognitiveLevel: 'high',
  globalTimeout: 30000,
  autoRetries: 3,
  errorStrategy: 'escalate',
  loggingLevel: 'info',
  enableCognitiveLogs: true,
  logPersistence: 'file',
  cacheEnabled: true,
  cacheTTL: 3600,
  workerCount: 4,
  workerMode: 'auto',
  processingMode: 'hybrid',
  optimizationGoal: 'stability',
};

export function ConfigPanelGeneral({ onSave }: ConfigPanelGeneralProps) {
  const [config, setConfig] = useState<GeneralConfig>(DEFAULT_CONFIG);
  const [originalConfig, setOriginalConfig] = useState<GeneralConfig>(DEFAULT_CONFIG);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [errors, setErrors] = useState<Partial<Record<keyof GeneralConfig, string>>>({});
  const [avatarPreview, setAvatarPreview] = useState<string>('');
  const [roleAdvancedOpen, setRoleAdvancedOpen] = useState(false);

  const selectedRoleDetail: AgentRoleDetail | undefined = useMemo(() => {
    return getRoleById(config.agentRole);
  }, [config.agentRole]);

  // Cargar configuración al montar
  useEffect(() => {
    loadConfiguration();
  }, []);

  // Limpiar mensajes de éxito después de 3 segundos
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  const loadConfiguration = async () => {
    try {
      setLoading(true);
      const loaded = await configService.loadConfig();
      setConfig(loaded);
      setOriginalConfig(loaded);
      setAvatarPreview(loaded.agentAvatarUrl);
      setError(null);
    } catch (err: any) {
      console.error('Error cargando configuración:', err);
      setError('No se pudo cargar la configuración, usando defaults');
      setConfig(DEFAULT_CONFIG);
      setOriginalConfig(DEFAULT_CONFIG);
    } finally {
      setLoading(false);
    }
  };

  const handleConfigChange = (key: keyof GeneralConfig, value: any) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
    // Limpiar error del campo cuando cambia
    if (errors[key]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[key];
        return newErrors;
      });
    }
  };

  const validateConfig = (): boolean => {
    const newErrors: Partial<Record<keyof GeneralConfig, string>> = {};

    if (!config.agentName || config.agentName.trim().length === 0) {
      newErrors.agentName = 'El nombre es requerido';
    }

    if (config.agentName.length > 100) {
      newErrors.agentName = 'Máximo 100 caracteres';
    }

    if (config.globalTimeout < 1000 || config.globalTimeout > 300000) {
      newErrors.globalTimeout = 'Entre 1000 y 300000 ms';
    }

    if (config.cacheTTL < 60 || config.cacheTTL > 86400) {
      newErrors.cacheTTL = 'Entre 60 y 86400 segundos';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const hasChanges = JSON.stringify(config) !== JSON.stringify(originalConfig);

  const handleSave = async () => {
    if (!validateConfig()) {
      setError('Por favor corrige los errores');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      const saved = await configService.saveConfig(config);
      setOriginalConfig(saved);
      setSuccess('✓ Configuración guardada correctamente');
      onSave?.(saved);
    } catch (err: any) {
      setError(`Error al guardar: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!confirm('¿Restaurar valores por defecto?')) return;

    try {
      setSaving(true);
      setError(null);
      const reset = await configService.resetToDefaults();
      setConfig(reset);
      setOriginalConfig(reset);
      setSuccess('✓ Valores por defecto restaurados');
    } catch (err: any) {
      setError(`Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleRevert = () => {
    if (!confirm('¿Descartar cambios?')) return;
    setConfig(originalConfig);
    setErrors({});
  };

  const handleExport = () => {
    configService.exportConfig(config);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const imported = await configService.importConfig(file);
      setConfig(imported);
      setSuccess('✓ Configuración importada');
    } catch (err: any) {
      setError(`Error al importar: ${err.message}`);
    }

    // Limpiar input
    e.target.value = '';
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
      setErrors((prev) => ({ ...prev, agentAvatarUrl: 'Solo imágenes permitidas' }));
      return;
    }

    // Validar tamaño (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setErrors((prev) => ({ ...prev, agentAvatarUrl: 'Máximo 5MB' }));
      return;
    }

    // Crear preview
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setAvatarPreview(base64);
      handleConfigChange('agentAvatarUrl', base64);
    };
    reader.readAsDataURL(file);

    e.target.value = '';
  };

  const executionModes = {
    assisted: '🤝 Asistido',
    autonomous: '🤖 Autónomo',
    supervised: '👀 Supervisado',
  };

  const cognitiveLevels = {
    low: 'Conservador',
    medium: 'Equilibrado',
    high: 'Agresivo',
    experimental: '🔬 Experimental',
  };

  const applyRoleFromAdvanced = (roleId: string) => {
    handleConfigChange('agentRole', roleId);
    setRoleAdvancedOpen(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin mb-4">⚙️</div>
          <p className="text-neutral-400">Cargando configuración...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Mensajes */}
      {error && (
        <div className="p-4 rounded-lg bg-red-950/40 border border-red-500/30 text-red-200 text-sm">
          ⚠️ {error}
        </div>
      )}
      {success && (
        <div className="p-4 rounded-lg bg-green-950/40 border border-green-500/30 text-green-200 text-sm animate-pulse">
          {success}
        </div>
      )}

      {/* SECCIÓN 1: IDENTIDAD DEL AGENTE */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-bold text-accent-400">👤 Identidad del Agente</h3>
          <span className="text-xs text-neutral-500">Core • Sistema</span>
        </div>
        <p className="text-sm text-neutral-400">
          Define quién es AURA y cómo se presenta al ecosistema.
        </p>

        {/* Grid única columna: Nombre + Avatar compacto + Rol + Resumen avanzado */}
        <div className="space-y-4">
          {/* Nombre del Agente */}
          <ConfigTooltip
            label="Nombre del Agente"
            tooltip="Identificador público del agente. Aparece en logs, reportes y interfaces."
            required
            error={errors.agentName}
          >
            <input
              type="text"
              value={config.agentName}
              onChange={(e) => handleConfigChange('agentName', e.target.value)}
              className={`input w-full ${errors.agentName ? 'border-red-500' : ''}`}
              placeholder="Ej: AURA Orchestrator"
              maxLength={100}
            />
            <p className="text-xs text-neutral-500 mt-1">
              {config.agentName.length}/100 caracteres
            </p>
          </ConfigTooltip>

          {/* Avatar compacto */}
          <ConfigTooltip
            label="Avatar del Agente"
            tooltip="Imagen que representa visualmente al agente. Max 5MB."
            error={errors.agentAvatarUrl}
          >
            <div className="space-y-2">
              <div className="flex gap-2">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                  id="avatar-upload-inline"
                />
                <label htmlFor="avatar-upload-inline" className="flex-1">
                  <button
                    type="button"
                    onClick={() => document.getElementById('avatar-upload-inline')?.click()}
                    className="btn btn-secondary w-full text-xs"
                  >
                    📤 Subir Imagen
                  </button>
                </label>
                {config.agentAvatarUrl && (
                  <button
                    type="button"
                    onClick={() => handleConfigChange('agentAvatarUrl', '')}
                    className="btn btn-ghost text-xs"
                  >
                    ✕
                  </button>
                )}
              </div>

              {avatarPreview ? (
                <div className="w-full h-28 rounded-lg border border-accent-500/30 overflow-hidden">
                  <img src={avatarPreview} alt="Avatar Preview" className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="w-full h-28 rounded-lg border border-white/5 flex items-center justify-center text-neutral-500">
                  Sin avatar
                </div>
              )}
            </div>
          </ConfigTooltip>

          {/* Selector de Rol */}
          <RoleSelector
            selectedRoleId={config.agentRole}
            onRoleChange={(roleId) => handleConfigChange('agentRole', roleId)}
            error={errors.agentRole}
          />

          {/* Resumen compacto del rol seleccionado CON botón de opciones avanzadas */}
          {selectedRoleDetail && (
            <div className="p-4 rounded-lg bg-base-900/40 border border-accent-500/10 space-y-2">
              <div className="flex items-start gap-3">
                <span className="text-3xl">{selectedRoleDetail.icon}</span>
                <div className="flex-1">
                  <div className="font-bold text-neutral-100">{selectedRoleDetail.label}</div>
                  <div className="text-xs text-neutral-400 line-clamp-3">{selectedRoleDetail.description}</div>
                </div>
              </div>

              <div className="flex gap-2 mt-2 flex-wrap">
                <span className="text-xs px-2 py-1 rounded-full text-neutral-200 bg-base-800/40">
                  Focus: {selectedRoleDetail.focus}
                </span>
                <span className="text-xs px-2 py-1 rounded-full text-yellow-400 bg-base-800/40">
                  Complejidad: {selectedRoleDetail.complexity}
                </span>
                <span className="text-xs px-2 py-1 rounded-full text-blue-300 bg-base-800/40">
                  Autonomía: {selectedRoleDetail.autonomy_level}
                </span>
                {selectedRoleDetail.requires_approval && (
                  <span className="text-xs px-2 py-1 rounded-full text-orange-300 bg-base-800/40">
                    Requiere aprobación
                  </span>
                )}
              </div>

              <button
                onClick={() => setRoleAdvancedOpen(true)}
                className="text-xs text-accent-400 hover:text-accent-300 transition-colors mt-2"
              >
                Mostrar opciones avanzadas del rol →
              </button>
            </div>
          )}
        </div>

        {/* Descripción Larga */}
        <ConfigTooltip
          label="Descripción del Agente"
          tooltip="Contexto detallado sobre el propósito y capacidades del agente. Usado por sistemas de razonamiento."
        >
          <textarea
            value={config.agentDescription}
            onChange={(e) => handleConfigChange('agentDescription', e.target.value)}
            className="input w-full h-24 text-sm resize-none"
            placeholder="Describe el propósito y capacidades de este agente..."
            maxLength={500}
          />
          <p className="text-xs text-neutral-500 mt-1">
            {config.agentDescription.length}/500 caracteres
          </p>
        </ConfigTooltip>

        {/* Modo de Ejecución */}
        <ConfigTooltip
          label="Modo de Ejecución"
          tooltip="🤝 Asistido: requiere confirmación. 🤖 Autónomo: sin intervención. 👀 Supervisado: reporta periódicamente."
          required
        >
          <div className="space-y-2">
            {Object.entries(executionModes).map(([key, label]) => (
              <label key={key} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 cursor-pointer">
                <input
                  type="radio"
                  name="executionMode"
                  value={key}
                  checked={config.executionMode === key}
                  onChange={(e) => handleConfigChange('executionMode', e.target.value as any)}
                  className="w-4 h-4"
                />
                <span className="text-sm text-neutral-300">{label}</span>
              </label>
            ))}
          </div>
        </ConfigTooltip>

        {/* Nivel Cognitivo */}
        <ConfigTooltip
          label="Nivel de Autonomía Cognitiva"
          tooltip="Bajo = seguro, lento. Experimental = rápido, riesgoso. Afecta decisiones automáticas."
          required
        >
          <ConfigSlider
            min={0}
            max={3}
            value={Object.keys(cognitiveLevels).indexOf(config.cognitiveLevel)}
            onChange={(idx) => {
              const levels = Object.keys(cognitiveLevels) as Array<keyof typeof cognitiveLevels>;
              handleConfigChange('cognitiveLevel', levels[idx]);
            }}
            labels={cognitiveLevels}
            showInput={false}
          />
        </ConfigTooltip>
      </div>

      {/* ============================================
          SECCIÓN 2: COMPORTAMIENTO DEL SISTEMA
          ============================================ */}
      <div className="space-y-4 pt-8 border-t border-white/10">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-bold text-accent-400">⚙️ Comportamiento del Sistema</h3>
          <span className="text-xs text-neutral-500">Runtime • Reactividad</span>
        </div>
        <p className="text-sm text-neutral-400">
          Configura cómo AURA reacciona ante errores y condiciones adversas.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Timeout Global */}
          <ConfigTooltip
            label="Timeout Global (ms)"
            tooltip="Tiempo máximo antes de cancelar operación. Previene bloqueos indefinidos."
            required
            error={errors.globalTimeout}
          >
            <ConfigSlider
              min={1000}
              max={300000}
              step={1000}
              value={config.globalTimeout}
              onChange={(val) => handleConfigChange('globalTimeout', val)}
              unit=" ms"
            />
          </ConfigTooltip>

          {/* Reintentos */}
          <ConfigTooltip
            label="Reintentos Automáticos"
            tooltip="Número de veces que reintenta operaciones fallidas."
            required
          >
            <ConfigSlider
              min={0}
              max={10}
              value={config.autoRetries}
              onChange={(val) => handleConfigChange('autoRetries', val)}
              unit=" intentos"
              showInput={false}
            />
          </ConfigTooltip>
        </div>

        {/* Estrategia de Errores */}
        <ConfigTooltip
          label="Estrategia de Manejo de Errores"
          tooltip="immediate: falla rápido. silent: reintenta silenciosamente. escalate: reporta al orquestador."
          required
        >
          <div className="grid grid-cols-3 gap-2">
            {[
              { key: 'immediate', label: '⚡ Inmediata', desc: 'Falla rápido' },
              { key: 'silent', label: '🤐 Silenciosa', desc: 'Reintenta' },
              { key: 'escalate', label: '📈 Escalada', desc: 'Reporta' },
            ].map(({ key, label, desc }) => (
              <button
                key={key}
                onClick={() => handleConfigChange('errorStrategy', key as any)}
                className={`p-3 rounded-lg border text-center text-xs transition-all ${
                  config.errorStrategy === key
                    ? 'border-accent-500/60 bg-accent-500/10'
                    : 'border-white/10 hover:border-white/20'
                }`}
              >
                <div className="font-bold text-neutral-100">{label}</div>
                <div className="text-neutral-500 text-xs">{desc}</div>
              </button>
            ))}
          </div>
        </ConfigTooltip>

        {/* Logging */}
        <div className="space-y-4 p-4 rounded-lg bg-base-900/40 border border-white/5">
          <ConfigTooltip
            label="Nivel de Logging"
            tooltip="debug: todo detallado. info: importante. warn: problemas. error: solo críticos."
            required
          >
            <select
              value={config.loggingLevel}
              onChange={(e) => handleConfigChange('loggingLevel', e.target.value as any)}
              className="input w-full"
            >
              <option value="debug">🐛 Debug (verbose)</option>
              <option value="info">ℹ️ Info (recomendado)</option>
              <option value="warn">⚠️ Warn (solo problemas)</option>
              <option value="error">❌ Error (críticos)</option>
            </select>
          </ConfigTooltip>

          <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5">
            <ConfigTooltip
              label="Logs Cognitivos"
              tooltip="Registra decisiones internas de AURA. Útil para debugging avanzado."
            >
              <div />
            </ConfigTooltip>
            <ConfigToggle
              enabled={config.enableCognitiveLogs}
              onChange={(val) => handleConfigChange('enableCognitiveLogs', val)}
            />
          </div>

          <ConfigTooltip
            label="Persistencia de Logs"
            tooltip="memory: rápido, se pierde. file: local, persistente. external: cloud storage."
            required
          >
            <select
              value={config.logPersistence}
              onChange={(e) => handleConfigChange('logPersistence', e.target.value as any)}
              className="input w-full"
            >
              <option value="memory">💾 En Memoria (rápido)</option>
              <option value="file">📄 Archivo (persistente)</option>
              <option value="external">☁️ Externo (cloud)</option>
            </select>
          </ConfigTooltip>
        </div>
      </div>

      {/* ============================================
          SECCIÓN 3: OPTIMIZACIÓN DE RENDIMIENTO
          ============================================ */}
      <div className="space-y-4 pt-8 border-t border-white/10">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-bold text-accent-400">⚡ Optimización de Rendimiento</h3>
          <span className="text-xs text-neutral-500">Advanced • Power-User</span>
        </div>
        <p className="text-sm text-neutral-400">
          Ajusta eficiencia, escalabilidad y estrategia de procesamiento.
        </p>

        {!showAdvanced && (
          <button
            onClick={() => setShowAdvanced(true)}
            className="text-sm text-accent-400 hover:text-accent-300 transition-colors"
          >
            ➕ Mostrar opciones avanzadas
          </button>
        )}

        {showAdvanced && (
          <div className="space-y-4 p-4 rounded-lg bg-base-900/20 border border-accent-500/20">
            {/* Caché */}
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5">
                <ConfigTooltip
                  label="Sistema de Caché"
                  tooltip="Guarda resultados frecuentes para acelerar respuestas. Mejora latencia."
                >
                  <div />
                </ConfigTooltip>
                <ConfigToggle
                  enabled={config.cacheEnabled}
                  onChange={(val) => handleConfigChange('cacheEnabled', val)}
                />
              </div>

              {config.cacheEnabled && (
                <ConfigTooltip
                  label="TTL del Caché (segundos)"
                  tooltip="Tiempo antes de expirar datos. Bajo = fresco, Alto = más caché."
                  error={errors.cacheTTL}
                >
                  <ConfigSlider
                    min={60}
                    max={86400}
                    step={60}
                    value={config.cacheTTL}
                    onChange={(val) => handleConfigChange('cacheTTL', val)}
                    unit=" s"
                  />
                </ConfigTooltip>
              )}
            </div>

            {/* Workers */}
            <div className="space-y-3 p-3 rounded-lg bg-white/5 border border-white/5">
              <div className="flex items-center justify-between">
                <ConfigTooltip
                  label="Modo de Workers"
                  tooltip="auto: AURA detecta óptimo. manual: configuras tú mismo."
                >
                  <div />
                </ConfigTooltip>
                <div className="flex gap-2">
                  {['auto', 'manual'].map((mode) => (
                    <button
                      key={mode}
                      onClick={() => handleConfigChange('workerMode', mode as any)}
                      className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                        config.workerMode === mode
                          ? 'bg-accent-500/20 text-accent-400 border border-accent-500/50'
                          : 'bg-white/5 text-neutral-400 border border-white/10'
                      }`}
                    >
                      {mode === 'auto' ? '🤖 Auto' : '⚙️ Manual'}
                    </button>
                  ))}
                </div>
              </div>

              {config.workerMode === 'manual' && (
                <ConfigTooltip
                  label="Número de Workers"
                  tooltip="Procesos paralelos. Más = concurrencia, menos = menos overhead."
                >
                  <ConfigSlider
                    min={1}
                    max={16}
                    value={config.workerCount}
                    onChange={(val) => handleConfigChange('workerCount', val)}
                    unit=" workers"
                    showInput={false}
                  />
                </ConfigTooltip>
              )}
            </div>

            {/* Modo de Procesamiento */}
            <ConfigTooltip
              label="Modo de Procesamiento"
              tooltip="realtime: inmediato. batch: agrupa. hybrid: elige según carga."
              required
            >
              <div className="grid grid-cols-3 gap-2">
                {[
                  { key: 'realtime', label: '⚡ Real-time', desc: 'Inmediato' },
                  { key: 'batch', label: '📦 Batch', desc: 'Agrupado' },
                  { key: 'hybrid', label: '🔄 Híbrido', desc: 'Adapta' },
                ].map(({ key, label, desc }) => (
                  <button
                    key={key}
                    onClick={() => handleConfigChange('processingMode', key as any)}
                    className={`p-3 rounded-lg border text-center text-xs transition-all ${
                      config.processingMode === key
                        ? 'border-accent-500/60 bg-accent-500/10'
                        : 'border-white/10 hover:border-white/20'
                    }`}
                  >
                    <div className="font-bold text-neutral-100">{label}</div>
                    <div className="text-neutral-500 text-xs">{desc}</div>
                  </button>
                ))}
              </div>
            </ConfigTooltip>

            {/* Goal de Optimización */}
            <ConfigTooltip
              label="Objetivo de Optimización"
              tooltip="latency: minimiza tiempo. cost: minimiza recursos. stability: maximiza confiabilidad."
              required
            >
              <div className="grid grid-cols-3 gap-2">
                {[
                  { key: 'latency', label: '🚀 Latencia', desc: 'Rápido' },
                  { key: 'cost', label: '💰 Costo', desc: 'Económico' },
                  { key: 'stability', label: '🛡️ Estabilidad', desc: 'Confiable' },
                ].map(({ key, label, desc }) => (
                  <button
                    key={key}
                    onClick={() => handleConfigChange('optimizationGoal', key as any)}
                    className={`p-3 rounded-lg border text-center text-xs transition-all ${
                      config.optimizationGoal === key
                        ? 'border-accent-500/60 bg-accent-500/10'
                        : 'border-white/10 hover:border-white/20'
                    }`}
                  >
                    <div className="font-bold text-neutral-100">{label}</div>
                    <div className="text-neutral-500 text-xs">{desc}</div>
                  </button>
                ))}
              </div>
            </ConfigTooltip>
          </div>
        )}
      </div>

      {/* BOTONES DE ACCIÓN */}
      <div className="flex gap-2 pt-8 border-t border-white/10 flex-wrap">
        <Button
          variant="primary"
          onClick={handleSave}
          disabled={!hasChanges || saving}
          className="uppercase tracking-wider"
        >
          {saving ? '⏳ Guardando...' : '💾 Guardar Configuración'}
        </Button>

        {hasChanges && (
          <Button variant="ghost" onClick={handleRevert} disabled={saving} className="uppercase tracking-wider">
            ↶ Descartar Cambios
          </Button>
        )}

        <Button
          variant="secondary"
          onClick={handleReset}
          disabled={saving}
          className="uppercase tracking-wider"
        >
          ↺ Restaurar Defaults
        </Button>

        <Button
          variant="ghost"
          onClick={handleExport}
          disabled={saving}
          className="uppercase tracking-wider"
        >
          📥 Exportar
        </Button>

        <label>
          <input
            type="file"
            accept=".json"
            onChange={handleImport}
            className="hidden"
            disabled={saving}
          />
          <Button variant="ghost" className="uppercase tracking-wider" disabled={saving}>
            📤 Importar
          </Button>
        </label>
      </div>

      {hasChanges && (
        <div className="p-3 rounded-lg bg-yellow-950/40 border border-yellow-500/30 text-yellow-200 text-xs flex items-center gap-2">
          ⚠️ Tienes cambios sin guardar
        </div>
      )}

      {/* Modal de opciones avanzadas del rol */}
      {roleAdvancedOpen && selectedRoleDetail && (
        <RoleAdvancedPanel
          open={roleAdvancedOpen}
          role={selectedRoleDetail}
          onClose={() => setRoleAdvancedOpen(false)}
          onApply={(roleId) => {
            handleConfigChange('agentRole', roleId);
            setRoleAdvancedOpen(false);
          }}
        />
      )}
    </div>
  );
}
