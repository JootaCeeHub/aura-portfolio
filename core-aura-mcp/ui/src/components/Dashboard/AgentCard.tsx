import React, { useState } from 'react';

import StatusDot from './StatusDot';
import { useAgentDetails } from '../../hooks/useMetrics';
import type { AgentStats } from '../../../../src/lib/metrics';

type Props = {
	agentName: string;
	stats: AgentStats | null;
	onClick: () => void;
	selected?: boolean;
};

export default function AgentCard({ agentName, stats, onClick, selected = false }: Props) {
	const [showTooltip, setShowTooltip] = useState(false);
	const [now] = useState(() => Date.now());
	const details = useAgentDetails(selected ? agentName : null);

	const getStatus = (): 'ok' | 'executing' | 'warning' | 'error' | 'idle' => {
		if (!stats) return 'idle';

		const lastExecMinutesAgo = stats.lastUpdated ? (now - stats.lastUpdated) / 1000 / 60 : Infinity;

		if (stats.errorRate > 0.1) return 'error';
		if (stats.errorRate > 0.05) return 'warning';
		if (lastExecMinutesAgo < 1) return 'ok';
		if (lastExecMinutesAgo < 5) return 'idle';

		return 'idle';
	};

	const statusTooltip = {
		ok: 'Ejecutado con éxito hace < 1 min',
		executing: 'Ejecutando ahora',
		warning: 'Error rate elevado',
		error: 'Error rate > 10%',
		idle: 'Nunca ejecutado o hace > 5 min',
	};

	return (
		<div
			className={`bg-slate-700 rounded-lg p-4 cursor-pointer transition-all hover:bg-slate-600 border-2 ${selected ? 'border-cyan-500 shadow-lg shadow-cyan-500/50' : 'border-slate-600'
				} relative group`}
			onClick={onClick}
			onMouseEnter={() => setShowTooltip(true)}
			onMouseLeave={() => setShowTooltip(false)}
		>
			<div className="flex items-start justify-between mb-2">
				<h4 className="text-sm font-bold text-cyan-400">{agentName}</h4>
				<StatusDot
					status={getStatus()}
					animated={getStatus() === 'executing'}
					tooltip={statusTooltip[getStatus()]}
				/>
			</div>

			{stats && (
				<div className="text-xs text-slate-300 space-y-1">
					<div>
						Executions: <span className="text-yellow-400">{stats.totalExecutions}</span>
					</div>
					<div>
						Avg Latency: <span className="text-yellow-400">{Math.round(stats.averageLatency)}ms</span>
					</div>
					<div>
						Success:{' '}
						<span className={stats.errorRate < 0.05 ? 'text-green-400' : 'text-red-400'}>
							{((1 - stats.errorRate) * 100).toFixed(0)}%
						</span>
					</div>
				</div>
			)}

			{/* Tooltip Avanzado */}
			{showTooltip && (
				<div className="absolute bottom-full left-0 mb-2 bg-slate-900 border border-slate-600 rounded p-4 text-xs w-56 z-10 shadow-lg animate-fadeIn">
					<div className="font-bold text-cyan-400 mb-3">{agentName}</div>

					<div className="text-slate-300 space-y-2">
						<div className="grid grid-cols-2 gap-2">
							<div>
								<div className="text-slate-500">Type</div>
								<div>Agent</div>
							</div>
							<div>
								<div className="text-slate-500">Temp</div>
								<div>0.7</div>
							</div>
						</div>

						<div>
							<div className="text-slate-500">Tools</div>
							<div className="text-slate-400">code.analyze, code.refactor, tests.gen</div>
						</div>

						{details && (
							<>
								<div className="border-t border-slate-700 pt-2">
									<div className="text-slate-500">Last Error</div>
									<div className="text-red-400 text-xs truncate">{details.lastError || 'None'}</div>
								</div>

								<div>
									<div className="text-slate-500">Memory (tokens)</div>
									<div>{details.memoryUsedTokens || 0}</div>
								</div>
							</>
						)}
					</div>
				</div>
			)}
		</div>
	);
}
