export type GeneralConfig = {
  agentName: string;
  agentDescription: string;
  agentRole: string;
  agentAvatarUrl: string;
  executionMode: 'supervised' | 'assisted' | 'autonomous';
  cognitiveLevel: 'low' | 'medium' | 'high' | 'experimental';
  globalTimeout: number;
  autoRetries: number;
  errorStrategy: 'immediate' | 'silent' | 'escalate';
  loggingLevel: 'debug' | 'info' | 'warn' | 'error';
  enableCognitiveLogs: boolean;
  logPersistence: 'memory' | 'file' | 'external';
  cacheEnabled: boolean;
  cacheTTL: number;
  workerCount: number;
  workerMode: 'auto' | 'manual';
  processingMode: 'realtime' | 'batch' | 'hybrid';
  optimizationGoal: 'latency' | 'cost' | 'stability';
};

class ConfigService {
  private configKey = 'aura_config';

  async loadConfig(): Promise<GeneralConfig> {
    try {
      const stored = localStorage.getItem(this.configKey);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Error loading config from localStorage:', e);
    }
    return this.getDefaults();
  }

  async saveConfig(config: GeneralConfig): Promise<GeneralConfig> {
    try {
      localStorage.setItem(this.configKey, JSON.stringify(config));
      return config;
    } catch (e) {
      throw new Error(`Error saving config: ${e}`);
    }
  }

  async resetToDefaults(): Promise<GeneralConfig> {
    const defaults = this.getDefaults();
    localStorage.setItem(this.configKey, JSON.stringify(defaults));
    return defaults;
  }

  async importConfig(file: File): Promise<GeneralConfig> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const config = JSON.parse(e.target?.result as string);
          localStorage.setItem(this.configKey, JSON.stringify(config));
          resolve(config);
        } catch (err) {
          reject(new Error('Invalid JSON file'));
        }
      };
      reader.onerror = () => reject(new Error('Error reading file'));
      reader.readAsText(file);
    });
  }

  exportConfig(config: GeneralConfig): void {
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `aura-config-${Date.now()}.json`;
    a.click();
  }

  private getDefaults(): GeneralConfig {
    return {
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
  }
}

export const configService = new ConfigService();
