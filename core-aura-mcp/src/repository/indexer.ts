import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ruta base del repositorio (src/repository)
const REPO_ROOT = path.resolve(__dirname);

/**
 * Utilidades para gestionar el repositorio de:
 *  - prompts
 *  - templates
 *  - forms (json)
 *  - knowledge (md)
 */
export class RepositoryIndexer {
  static basePath = REPO_ROOT;

  // ---------- Helpers internos ----------

  private static ensureDir(subdir: string) {
    const dir = path.join(this.basePath, subdir);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    return dir;
  }

  private static readTextFile(filePath: string): string {
    if (!fs.existsSync(filePath)) {
      throw new Error(`Archivo no encontrado: ${filePath}`);
    }
    return fs.readFileSync(filePath, 'utf8');
  }

  private static safeList(dir: string): string[] {
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir).filter((f) => !f.startsWith('.'));
  }

  // ---------- PROMPTS ----------

  static listPrompts(): string[] {
    const dir = this.ensureDir('prompts');
    return this.safeList(dir).map((f) => path.basename(f, path.extname(f)));
  }

  static loadPrompt(name: string): string {
    const dir = this.ensureDir('prompts');
    const file = path.join(dir, `${name}.txt`);
    return this.readTextFile(file);
  }

  // ---------- TEMPLATES ----------

  static listTemplates(): string[] {
    const dir = this.ensureDir('templates');
    return this.safeList(dir).map((f) => path.basename(f, path.extname(f)));
  }

  static loadTemplate(name: string): string {
    const dir = this.ensureDir('templates');
    const file = path.join(dir, `${name}.md`);
    return this.readTextFile(file);
  }

  // ---------- FORMS (JSON) ----------

  static listForms(): string[] {
    const dir = this.ensureDir('forms');
    return this.safeList(dir).map((f) => path.basename(f, path.extname(f)));
  }

  static loadForm(name: string): any {
    const dir = this.ensureDir('forms');
    const file = path.join(dir, `${name}.json`);
    const content = this.readTextFile(file);
    return JSON.parse(content);
  }

  // ---------- KNOWLEDGE (Markdown) ----------

  static listKnowledge(): string[] {
    const dir = this.ensureDir('knowledge');
    return this.safeList(dir).map((f) => path.basename(f, path.extname(f)));
  }

  static loadKnowledge(name: string): string {
    const dir = this.ensureDir('knowledge');
    const file = path.join(dir, `${name}.md`);
    return this.readTextFile(file);
  }

  // ---------- Snapshot general ----------

  static snapshot() {
    return {
      prompts: this.listPrompts(),
      templates: this.listTemplates(),
      forms: this.listForms(),
      knowledge: this.listKnowledge(),
    };
  }
}
