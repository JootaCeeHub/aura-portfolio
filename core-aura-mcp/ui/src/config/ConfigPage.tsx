import React, { useEffect, useState } from 'react';
import { getConfig, putConfig, previewConfig, getHistory, restoreSnapshot } from '../services/configApi';
import ConfigForm from './ConfigForm';

export function ConfigPage() {
	const [config, setConfig] = useState<any>(null);
	const [loading, setLoading] = useState(false);
	const [previewResult, setPreviewResult] = useState<any>(null);
	const [history, setHistory] = useState<any[]>([]);
	const [showHistory, setShowHistory] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [previewErrors, setPreviewErrors] = useState<Record<string, string[]>>({});

	// nuevo estado: pestaña activa
	const [activeTab, setActiveTab] = useState<'general'|'integrations'|'agents'|'tools'>('general');

	// fallback simple si no hay config
	const defaultConfig = {
		name: 'AURA Core',
		identity: { agentName: 'AURA Orchestrator', role: 'Orquestador Cog' },
		server: { port: 3000, logLevel: 'info' },
		repository: { prompts: 'src/repository/prompts', templates: 'src/repository/templates' }
	};

	useEffect(() => {
		(async () => {
			setLoading(true);
			try {
				const res = await getConfig();
				setConfig(res?.config ?? null);
			} catch (err: any) {
				setError(err.message ?? String(err));
			} finally {
				setLoading(false);
			}
		})();
	}, []);

	async function onSave(data: any) {
		setError(null);
		setPreviewErrors({});
		try {
			await putConfig(data);
			setConfig(data);
			alert('Configuración guardada');
		} catch (err: any) {
			setError(err.message ?? String(err));
		}
	}

	async function onPreview(data: any) {
		setError(null);
		try {
			const res = await previewConfig(data);
			setPreviewResult(res);
			if (!res.valid && res.errors) {
				setPreviewErrors(res.errors);
			} else {
				setPreviewErrors({});
			}
		} catch (err: any) {
			setError(err.message ?? String(err));
		}
	}

	async function loadHistory() {
		setError(null);
		try {
			const res = await getHistory();
			setHistory(res?.snapshots ?? []);
			setShowHistory(true);
		} catch (err: any) {
			setError(err.message ?? String(err));
		}
	}

	async function onRestore(file: string) {
		if (!confirm('Restaurar snapshot? Esto sobrescribirá la config actual.')) return;
		setError(null);
		try {
			const res = await restoreSnapshot(file);
			setConfig(res?.config ?? null);
			setShowHistory(false);
			setPreviewResult(null);
			setPreviewErrors({});
			alert('Snapshot restaurado');
		} catch (err: any) {
			setError(err.message ?? String(err));
		}
	}

	// pequeños estilos inline para pestañas y tarjetas
	const styles: Record<string, React.CSSProperties> = {
		container: { padding: 20 },
		cols: { display: 'flex', gap: 12 },
		left: { width: 240, background: '#071018', borderRadius: 8, padding: 8 },
		tabBtn: (active = false) => ({
			display: 'flex',
			alignItems: 'center',
			gap: 8,
			padding: '10px 12px',
			marginBottom: 8,
			borderRadius: 8,
			cursor: 'pointer',
			background: active ? 'linear-gradient(90deg,#0b2540,#082632)' : 'transparent',
			color: active ? '#9ef' : '#9db'
		}),
		right: { flex: 1 },
		card: { background: '#0b1020', padding: 12, borderRadius: 8, marginBottom: 12 },
		cardGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }
	};

	return (
		<div style={styles.container}>
			<h2>Panel de Configuración</h2>
			{loading && <div style={{ color: '#9ef' }}>Cargando...</div>}
			{error && <div style={{ color: '#f88', padding: 8, background: '#200', borderRadius: 4, marginBottom: 12 }}>{error}</div>}

			<div style={styles.cols}>
				{/* columna izquierda: pestañas */}
				<div style={styles.left}>
					<div style={styles.tabBtn(activeTab === 'general')} onClick={() => setActiveTab('general')}>
						{/* icono opcional */} <div style={{ fontWeight: 600 }}>General</div>
					</div>
					<div style={styles.tabBtn(activeTab === 'integrations')} onClick={() => setActiveTab('integrations')}>
						Integraciones
					</div>
					<div style={styles.tabBtn(activeTab === 'agents')} onClick={() => setActiveTab('agents')}>
						Agentes
					</div>
					<div style={styles.tabBtn(activeTab === 'tools')} onClick={() => setActiveTab('tools')}>
						Herramientas
					</div>

					<div style={{ marginTop: 12 }}>
						<button onClick={loadHistory}>Historial / Restore</button>
					</div>
				</div>

				{/* columna derecha: contenido */}
				<div style={styles.right}>
					{/* General tab */}
					{activeTab === 'general' && (
						<>
							<div style={styles.card}>
								<h4 style={{ marginTop: 0 }}>Resumen General</h4>
								<div style={styles.cardGrid}>
									{/* identidad */}
									<div style={{ background: '#07131a', padding: 12, borderRadius: 6 }}>
										<div style={{ fontSize: 12, color: '#7fb' }}>IDENTIDAD DEL AGENTE</div>
										<div style={{ marginTop: 8, color: '#9ef', fontWeight: 600 }}>
											{(config ?? defaultConfig).identity?.agentName ?? defaultConfig.identity.agentName}
										</div>
										<div style={{ fontSize: 12, color: '#9db' }}>
											Rol: {(config ?? defaultConfig).identity?.role ?? defaultConfig.identity.role}
										</div>
									</div>
									{/* servidor */}
									<div style={{ background: '#07131a', padding: 12, borderRadius: 6 }}>
										<div style={{ fontSize: 12, color: '#7fb' }}>SERVIDOR CORE</div>
										<div style={{ marginTop: 8, color: '#9ef', fontWeight: 600 }}>
											Puerto {(config ?? defaultConfig).server?.port ?? defaultConfig.server.port}
										</div>
										<div style={{ fontSize: 12, color: '#9db' }}>
											Nivel de Log: {(config ?? defaultConfig).server?.logLevel ?? defaultConfig.server.logLevel}
										</div>
									</div>

									{/* repository */}
									<div style={{ background: '#07131a', padding: 12, borderRadius: 6 }}>
										<div style={{ fontSize: 12, color: '#7fb' }}>REPOSITORIO</div>
										<div style={{ marginTop: 8, color: '#9ef', fontWeight: 600 }}>
											Prompts
										</div>
										<div style={{ fontSize: 12, color: '#9db' }}>
											{(config ?? defaultConfig).repository?.prompts ?? defaultConfig.repository.prompts}
										</div>
									</div>
									<div style={{ background: '#07131a', padding: 12, borderRadius: 6 }}>
										<div style={{ fontSize: 12, color: '#7fb' }}>Templates / Forms</div>
										<div style={{ marginTop: 8, color: '#9ef', fontWeight: 600 }}>
											Templates
										</div>
										<div style={{ fontSize: 12, color: '#9db' }}>
											{(config ?? defaultConfig).repository?.templates ?? defaultConfig.repository.templates}
										</div>
									</div>
								</div>
							</div>

							{/* Formulario editable: siempre renderizar con initial (fallback si es null) */}
							<div style={styles.card}>
								<h4 style={{ marginTop: 0 }}>Ajustes</h4>
								<ConfigForm
									initial={config ?? defaultConfig}
									onSubmit={onSave}
									onPreview={onPreview}
									previewErrors={previewErrors}
								/>
							</div>
						</>
					)}

					{/* Integrations tab placeholder */}
					{activeTab === 'integrations' && (
						<div style={styles.card}>
							<h4>Integraciones</h4>
							<div style={{ color: '#9db' }}>Configura integraciones externas aquí.</div>
						</div>
					)}

					{/* Agents tab placeholder */}
					{activeTab === 'agents' && (
						<div style={styles.card}>
							<h4>Agentes</h4>
							<div style={{ color: '#9db' }}>Lista de agentes y plantillas. Selecciona uno para editar.</div>
						</div>
					)}

					{/* Tools tab placeholder */}
					{activeTab === 'tools' && (
						<div style={styles.card}>
							<h4>Herramientas</h4>
							<div style={{ color: '#9db' }}>Configuración de herramientas y permisos.</div>
						</div>
					)}
				</div>
			</div>

			{/* Historial modal overlay */}
			{showHistory && (
				<div style={{ position: 'fixed', left: 80, top: 80, right: 80, bottom: 80, background: '#071018', padding: 12, borderRadius: 8, zIndex: 1000, overflow: 'auto' }}>
					<h3>Snapshots</h3>
					<div style={{ maxHeight: '80%', overflow: 'auto' }}>
						{history.length === 0 && <div style={{ color: '#9db' }}>No snapshots disponibles</div>}
						{history.map((s: any, i) => (
							<div key={s.file || i} style={{ padding: 8, borderBottom: '1px solid #111' }}>
								<div style={{ color: '#9ef' }}>
									<strong>{s.createdAt ?? 'unknown'}</strong> by {s.createdBy ?? 'unknown'}
								</div>
								<div style={{ marginTop: 6 }}>
									<button onClick={() => onRestore(s.file)} style={{ padding: '4px 8px', fontSize: '0.85rem' }}>
										Restaurar
									</button>
								</div>
							</div>
						))}
					</div>
					<div style={{ marginTop: 8 }}>
						<button onClick={() => setShowHistory(false)}>Cerrar</button>
					</div>
				</div>
			)}
		</div>
	);
}

export default ConfigPage;
