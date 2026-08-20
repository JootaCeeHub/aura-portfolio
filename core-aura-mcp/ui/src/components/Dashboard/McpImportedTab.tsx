import React, { useState, useEffect } from 'react';
// import chalk from 'chalk';
import { Logger } from '../../../../src/lib/logger';

interface McpFile {
	id: string;
	name: string;
	path: string;
	metadata: {
		title: string;
		description: string;
		importedFrom: string;
		importDate: string;
		wordCount: number;
		lineCount: number;
	};
	status: 'raw_import' | 'refined' | 'validated' | 'published';
	createdAt: string;
}

export default function McpImportedTab() {
	const [mcps, setMcps] = useState<McpFile[]>([]);
	const [selectedMcp, setSelectedMcp] = useState<McpFile | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		fetchMcps();
	}, []);

	const fetchMcps = async () => {
		setLoading(true);
		try {
			const res = await fetch('/api/mcp');
			const data = await res.json();
			setMcps(data.mcps || []);
			setError(null);
		} catch (err) {
			setError((err as Error).message);
			Logger.error('dashboard.mcpImported.fetchError', { error: (err as Error).message });
		} finally {
			setLoading(false);
		}
	};

	const handleDelete = async (id: string) => {
		if (!confirm(`¿Eliminar MCP: ${id}?`)) return;

		try {
			const res = await fetch(`/api/mcp/${id}`, { method: 'DELETE' });
			if (res.ok) {
				setMcps((prev) => prev.filter((m) => m.id !== id));
				setSelectedMcp(null);
				Logger.info('dashboard.mcpImported.deleted', { id });
			}
		} catch (err) {
			Logger.error('dashboard.mcpImported.deleteError', { error: (err as Error).message });
		}
	};

	const getStatusColor = (status: string): string => {
		switch (status) {
			case 'raw_import':
				return 'bg-yellow-900 text-yellow-400';
			case 'refined':
				return 'bg-blue-900 text-blue-400';
			case 'validated':
				return 'bg-green-900 text-green-400';
			case 'published':
				return 'bg-purple-900 text-purple-400';
			default:
				return 'bg-gray-900 text-gray-400';
		}
	};

	return (
		<div className="space-y-6 p-6">
			<div className="flex justify-between items-center">
				<h2 className="text-2xl font-bold text-cyan-400">📦 MCPs Importados</h2>
				<button
					onClick={fetchMcps}
					disabled={loading}
					className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 rounded font-medium"
				>
					{loading ? '⏳ Cargando...' : '🔄 Actualizar'}
				</button>
			</div>

			{error && <div className="bg-red-900 text-red-400 p-4 rounded">{error}</div>}

			{mcps.length === 0 ? (
				<div className="text-center py-12 bg-slate-800 rounded-lg border-2 border-dashed border-slate-600">
					<p className="text-slate-400">📭 No hay MCPs importados</p>
					<p className="text-sm text-slate-500 mt-2">
						Usa <code className="bg-slate-900 px-2 py-1 rounded">aura ingest documento.pdf</code> para importar
					</p>
				</div>
			) : (
				<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
					{/* Lista de MCPs */}
					<div className="lg:col-span-1 space-y-2">
						<div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
							{mcps.map((mcp) => (
								<button
									key={mcp.id}
									onClick={() => setSelectedMcp(mcp)}
									className={`w-full text-left px-4 py-3 border-b border-slate-700 hover:bg-slate-700 transition-colors ${selectedMcp?.id === mcp.id ? 'bg-cyan-500/20 border-l-4 border-l-cyan-400' : ''
										}`}
								>
									<div className="flex items-center justify-between">
										<div className="flex-1 min-w-0">
											<p className="font-bold text-cyan-400 truncate">{mcp.metadata.title}</p>
											<p className="text-xs text-slate-400 truncate">{mcp.name}</p>
										</div>
										<span className={`px-2 py-1 rounded text-xs font-bold ml-2 whitespace-nowrap ${getStatusColor(mcp.status)}`}>
											{mcp.status}
										</span>
									</div>
								</button>
							))}
						</div>
						<p className="text-xs text-slate-500 text-center">Total: {mcps.length}</p>
					</div>

					{/* Detalle del MCP seleccionado */}
					{selectedMcp && (
						<div className="lg:col-span-2 space-y-4">
							<div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
								<div className="flex justify-between items-start mb-4">
									<div>
										<h3 className="text-2xl font-bold text-cyan-400">{selectedMcp.metadata.title}</h3>
										<p className="text-slate-400 mt-2">{selectedMcp.metadata.description}</p>
									</div>
									<button
										onClick={() => handleDelete(selectedMcp.id)}
										className="px-3 py-2 bg-red-600 hover:bg-red-700 rounded text-sm font-bold"
									>
										🗑️ Eliminar
									</button>
								</div>

								<div className="grid grid-cols-2 gap-4 mb-6">
									<div className="bg-slate-700 p-3 rounded">
										<div className="text-slate-400 text-xs">Importado desde</div>
										<div className="text-yellow-400 font-mono text-sm">{selectedMcp.metadata.importedFrom}</div>
									</div>
									<div className="bg-slate-700 p-3 rounded">
										<div className="text-slate-400 text-xs">Fecha de importación</div>
										<div className="text-blue-400 font-mono text-sm">
											{new Date(selectedMcp.metadata.importDate).toLocaleString()}
										</div>
									</div>
									<div className="bg-slate-700 p-3 rounded">
										<div className="text-slate-400 text-xs">Palabras</div>
										<div className="text-green-400 font-bold">{selectedMcp.metadata.wordCount}</div>
									</div>
									<div className="bg-slate-700 p-3 rounded">
										<div className="text-slate-400 text-xs">Líneas</div>
										<div className="text-green-400 font-bold">{selectedMcp.metadata.lineCount}</div>
									</div>
								</div>

								{/* Acciones */}
								<div className="space-y-2">
									<button className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded font-medium">
										🔍 Ver contenido
									</button>
									<button className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded font-medium">
										🔄 Refinar automáticamente
									</button>
									<button className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 rounded font-medium">
										✅ Validar
									</button>
									<button className="w-full px-4 py-2 bg-orange-600 hover:bg-orange-700 rounded font-medium">
										📤 Exportar
									</button>
								</div>

								{/* Status detail */}
								<div className="mt-6 pt-6 border-t border-slate-600">
									<h4 className="text-sm font-bold text-slate-400 mb-3">Estado Actual</h4>
									<div className={`px-4 py-3 rounded ${getStatusColor(selectedMcp.status)}`}>
										<p className="font-bold">
											{selectedMcp.status === 'raw_import' && '📥 Importación Bruta'}
											{selectedMcp.status === 'refined' && '✨ Refinado'}
											{selectedMcp.status === 'validated' && '✅ Validado'}
											{selectedMcp.status === 'published' && '🚀 Publicado'}
										</p>
										<p className="text-sm mt-2">
											{selectedMcp.status === 'raw_import' && 'Próximo paso: Refinar o Validar'}
											{selectedMcp.status === 'refined' && 'Próximo paso: Validar'}
											{selectedMcp.status === 'validated' && 'Próximo paso: Publicar o Exportar'}
											{selectedMcp.status === 'published' && 'Documento listo para usar'}
										</p>
									</div>
								</div>
							</div>
						</div>
					)}
				</div>
			)}
		</div>
	);
}
