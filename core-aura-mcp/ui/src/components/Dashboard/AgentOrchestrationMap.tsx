import React from 'react';

type Props = {
	onAgentSelect: (name: string) => void;
	selectedAgent: string | null;
};

export default function AgentOrchestrationMap({ onAgentSelect, selectedAgent }: Props) {
	/* const agentStats = useMemo(() => {
		return metricsCollector.getAllAgentStats();
	}, []); */

	// Estructura simplificada de flujo (en prod, obtener desde config/análisis)
	const agentFlow: Record<string, string[]> = {
		orchestrator_core: ['developer_core', 'trading_core', 'analyst_core'],
		developer_core: ['n8n_core'],
		trading_core: ['n8n_core'],
		analyst_core: [],
		n8n_core: [],
	};

	/* const getAgentColor = (name: string): string => {
		const stat = agentStats.find((s: any) => s.name === name);
		if (!stat) return 'bg-slate-700';
		if (stat.errorRate > 0.05) return 'bg-red-900';
		return 'bg-green-900';
	}; */

	/* const renderMermaidSvg = (): string => {
		let mermaid = 'graph TD\n';

		// Nodos
		Object.keys(agentFlow).forEach((agent) => {
			const isSelected = agent === selectedAgent ? ':::selected' : '';
			mermaid += `  ${agent}["${agent}"]${isSelected}\n`;
		});

		// Edges
		Object.entries(agentFlow).forEach(([source, targets]) => {
			targets.forEach((target) => {
				mermaid += `  ${source} --> ${target}\n`;
			});
		});

		// Estilos
		mermaid += `
	classDef selected fill:#0891b2,stroke:#06b6d4,stroke-width:3px
	classDef default fill:#334155,stroke:#64748b,stroke-width:2px
		`;

		return mermaid;
	}; */

	return (
		<div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
			<h3 className="text-lg font-bold text-cyan-400 mb-4">Agent Orchestration Map</h3>

			{/* Representación ASCII simple de gráfo */}
			<div className="bg-slate-900 p-4 rounded font-mono text-xs text-slate-300 overflow-auto max-h-64">
				<div className="space-y-2">
					{/* Orchestrator -> otros */}
					<div>
						<span className="text-blue-400 cursor-pointer hover:text-blue-300" onClick={() => onAgentSelect('orchestrator_core')}>
							orchestrator_core
						</span>
						<span className="text-slate-500"> ──→ </span>
					</div>
					<div className="pl-4 space-y-1">
						{agentFlow['orchestrator_core']?.map((agent) => (
							<div key={agent}>
								<span
									className={`cursor-pointer hover:text-cyan-300 ${selectedAgent === agent ? 'text-cyan-400 font-bold' : 'text-slate-400'}`}
									onClick={() => onAgentSelect(agent)}
								>
									{agent}
								</span>
								{agentFlow[agent] && agentFlow[agent].length > 0 && (
									<span className="text-slate-500"> ──→ {agentFlow[agent].join(', ')}</span>
								)}
							</div>
						))}
					</div>
				</div>

				{/* Legend */}
				<div className="mt-4 pt-4 border-t border-slate-700 text-xs text-slate-400">
					<div>● Green: Healthy</div>
					<div>● Red: Errors &gt; 5%</div>
					<div>● Click to select</div>
				</div>
			</div>
		</div>
	);
}
