export const Policies = {
  allowedCoreTools: [
    'core.get_status',
    'core.list_servers',
    'core.route_tool',
    'core.route_intent',
  ],

  forbiddenKeywords: [
    'instrucciones de hackeo',
    'cómo evadir seguridad',
    'ataques',
    'malware',
    'phishing',
    'bypass',
    'rootkit',
    'hackear',
    'bypass',
    'malware',
    'phishing',
    'ddos',
    'sql injection',
    'sql-injection',
    'ransomware',
  ],

  /**
   * Contenidos NO permitidos a nivel semántico.
   */
  checkTextAllowed(content: string): boolean {
    const lower = content.toLowerCase();
    for (const word of this.forbiddenKeywords) {
      if (lower.includes(word)) return false;
    }
    return true;
  },

  /**
   * Control de acceso por módulo según sensibilidad.
   */
  sensitiveScopes: {
    'mcp-devops': ['restart_service', 'deploy_container'],
    'mcp-security': ['analyze_logs', 'detect_anomaly'],
    'mcp-webscraping-anti-bot': ['scraping.scrape_dynamic'],
  } as Record<string, string[]>,

  isSensitiveOperation(serverName: string, tool: string): boolean {
    const scopes = this.sensitiveScopes[serverName] || [];
    return scopes.includes(tool);
  },
};
