import fs from 'fs';
import path from 'path';
import { z } from 'zod';
import YAML from 'yaml';

const AuraCoreSchema = z.object({
  version: z.string(),
  environment: z.string(),
  auraIdentity: z.object({
    name: z.string(),
    description: z.string(),
    owner: z.string(),
  }),
  systemPrompt: z.object({
    base: z.string(),
    objectives: z.array(z.string()),
    constraints: z.array(z.string()),
  }),
  modules: z.record(z.string(), z.any()),
  observability: z.object({
    enabled: z.boolean(),
    metrics: z.array(z.string()),
  }),
  security: z.object({
    roles: z.array(z.string()),
    defaultRole: z.string(),
    policiesFile: z.string(),
    internalToken: z.string().optional(),
  }),
});

export type AuraCoreConfig = z.infer<typeof AuraCoreSchema>;
export type SecurityPolicies = any;

function loadJsonFile(file: string) {
  return JSON.parse(fs.readFileSync(file, 'utf-8'));
}

function loadYamlFile(file: string) {
  return YAML.parse(fs.readFileSync(file, 'utf-8'));
}

export function loadAuraCoreConfig(): {
  config: AuraCoreConfig;
  policies: SecurityPolicies;
} {
  const candidates = [
    path.resolve(process.cwd(), 'config/aura-core.config.json'),
    path.resolve(process.cwd(), '../config/aura-core.config.json'),
  ];
  const jsonPath = candidates.find((p) => fs.existsSync(p)) || candidates[0];
  const raw = loadJsonFile(jsonPath);
  const config = AuraCoreSchema.parse(raw);

  const policyCandidates = [
    path.resolve(process.cwd(), config.security.policiesFile),
    path.resolve(path.dirname(jsonPath), '..', config.security.policiesFile),
    path.resolve(path.dirname(jsonPath), config.security.policiesFile),
  ];
  const policiesPath = policyCandidates.find((p) => fs.existsSync(p)) || policyCandidates[0];
  const policies = loadYamlFile(policiesPath);

  return { config, policies };
}
