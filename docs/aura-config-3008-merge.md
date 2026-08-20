# Configuración Global AURA – Derivada de AURA3008 MERGE

## 1. Visión General

- AURA = modelo modular orquestado por un **Módulo Maestro**.
- Objetivo: integrar IA, automatización (n8n, Zapier, Power Automate), análisis y gobernanza en un solo ecosistema. 

## 2. Lineamientos Globales

- **System Prompt Base**: definir identidad, objetivos y límites del agente.
- **Objetivos del Modelo**:
  - Implementación personalizada por organización.
  - Optimizar interacción intermodular.
  - Garantizar seguridad, cumplimiento y mejora continua. 

## 3. Módulo Maestro (Orquestador Estratégico)

- Rol: coordinar todos los módulos MCP, asegurar sinergia y trazabilidad E2E. 
- Responsabilidades:
  - Routing inteligente (LangChain + MCP).
  - Gobernanza y seguridad.
  - Observabilidad y mejora continua.

## 4. Módulos Clave del Ecosistema

- **Automatización Extendida**:
  - Integración nativa con n8n, Zapier, Power Automate. :contentReference[oaicite:3]{index=3}
- **Gobernanza y Seguridad**:
  - Definir políticas, roles, trazabilidad, SIEM, DLP, KMS. 
- **Tributario & Beneficios (Chile)**:
  - Flujos n8n + Supabase + AURA para control F29/F22/F50, KPIs y alertas. 

## 5. Map a Configuración Técnica

Este documento se refleja en:

- `config/aura-core.config.json` – parámetros globales.
- `config/security-policies.yml` – políticas de acceso, logging y retención.
- `config/mcp-registry.json` – registro de módulos MCP.
