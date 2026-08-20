import { describe, it, expect } from 'vitest';
import { RepositoryIndexer } from '../src/repository/indexer.js';

describe('RepositoryIndexer – Repositorio MCP', () => {
  it('puede listar prompts sin lanzar error', () => {
    const prompts = RepositoryIndexer.listPrompts();
    expect(Array.isArray(prompts)).toBe(true);
  });

  it('snapshot entrega la estructura base del repo', () => {
    const snap = RepositoryIndexer.snapshot();
    expect(snap).toHaveProperty('prompts');
    expect(snap).toHaveProperty('templates');
    expect(snap).toHaveProperty('forms');
    expect(snap).toHaveProperty('knowledge');
  });

  it('lanza error al cargar un prompt inexistente', () => {
    expect(() => RepositoryIndexer.loadPrompt('no_existe_123')).toThrow();
  });
});
