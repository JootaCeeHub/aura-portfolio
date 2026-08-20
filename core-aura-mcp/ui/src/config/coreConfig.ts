// Configuración dinámica del Core (Discovery)
export const DEFAULT_CORE_URL = 'http://localhost:3000';

export interface ServerConfig {
  url: string;
}

/**
 * Intenta cargar la configuración dinámica del servdor (generada por el backend al inicio).
 * Si falla, usa las variables de entorno o el default.
 */
export async function getCoreConfig(): Promise<ServerConfig> {
  try {
    // Intentar leer server-config.json (debe estar en public/)
    const res = await fetch('/server-config.json');
    if (res.ok) {
      const config = await res.json();
      if (config.url) {
        console.log('[Configuration] Loaded from server-config.json:', config.url);
        return { url: config.url };
      }
    }
  } catch {
    // Ignorar error y usar fallback
  }

  const envUrl = import.meta.env.VITE_AURA_CORE_URL;
  if (envUrl) {
    console.log('[Configuration] Loaded from VITE env:', envUrl);
    return { url: envUrl };
  }

  console.warn('[Configuration] Using default fallback:', DEFAULT_CORE_URL);
  return { url: DEFAULT_CORE_URL };
}

// Mantener compatibilidad hacia atrás inmediata, pero idealmente usar getCoreConfig()
export const CORE_URL = import.meta.env.VITE_AURA_CORE_URL || DEFAULT_CORE_URL;
