import { Command, Flags } from '@oclif/core';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { importMcpFileToProject } from '../../../core-aura-mcp/src/mcp/mcpImporter';

export default class Ingest extends Command {
	static description = 'Ingestar documento (PDF/TXT/MCP) y convertir a MCP dentro del proyecto';

	static flags = {
		autoRefine: Flags.boolean({ char: 'r', description: 'Intentar refinamiento automático (si está configurado)' }),
		output: Flags.string({ char: 'o', description: 'Carpeta destino dentro del proyecto' }),
		python: Flags.string({ description: 'Comando python (python|python3). Se busca en PATH si no se indica.' }),
	};

	static args = [{ name: 'file', required: true, description: 'Ruta al archivo a ingestar' }];

	async run(): Promise<void> {
		const { args, flags } = await this.parse(Ingest);
		const file = args.file;
		if (!fs.existsSync(file)) {
			this.error(`Archivo no encontrado: ${file}`);
			return;
		}

		const ext = path.extname(file).toLowerCase();

		try {
			if (ext === '.pdf') {
				// Ejecutar script Python para extracción (scripts/script_pdf_to_mcp.py)
				const pythonCmd = flags.python ?? process.env.PYTHON_CMD ?? 'python';
				const scriptPath = path.join(process.cwd(), 'scripts', 'script_pdf_to_mcp.py');

				if (!fs.existsSync(scriptPath)) {
					this.error(`Script de conversión no encontrado: ${scriptPath}`);
					return;
				}

				this.log(`🔁 Ingestando PDF con ${pythonCmd}: ${file}`);
				await new Promise<void>((resolve, reject) => {
					const proc = spawn(pythonCmd, [scriptPath, file], { stdio: 'inherit' });
					proc.on('error', (err) => reject(err));
					proc.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`Python script exited ${code}`))));
				});

				this.log('✅ PDF procesado. Comprueba carpeta mcp_imported en la raíz del proyecto.');
			} else if (ext === '.json' || ext === '.mcp' || ext === '.txt') {
				// Usar importador TS para mover/validar MCP JSON o TXT
				if (ext === '.txt') {
					this.log('ℹ️ TXT detectado — convertir a MCP usando el importador interno (guardado como raw).');
				}

				this.log(`🔁 Importando archivo a proyecto: ${file}`);
				const dest = await importMcpFileToProject(file, flags.output ?? process.cwd());
				this.log(`✅ Archivo importado: ${dest}`);
			} else {
				this.error(`Formato no soportado: ${ext}. Soportados: .pdf, .txt, .mcp.json/.json`);
			}

			if (flags.autoRefine) {
				this.log('🔄 Auto-refine solicitado — en esta versión se notifica al Orchestrator (pendiente integración).');
				// En producción: disparar evento al Orchestrator / tool "refine_document"
			}
		} catch (err) {
			this.error(`Error al ingestar: ${(err as Error).message}`);
		}
	}
}
