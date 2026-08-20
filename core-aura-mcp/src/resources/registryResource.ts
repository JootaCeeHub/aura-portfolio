import { Registry } from '../lib/registry.js';

export function getRegistryResource() {
  return {
    modules: Registry.list(),
  };
}
