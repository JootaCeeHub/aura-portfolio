import React, { useState } from 'react';

import { metricsCollector } from '../../../../src/lib/metrics';

import { useMetrics } from '../../hooks/useMetrics';
import StatusDot from './StatusDot';

export default function CoreStatusPanel() {
	const { globalMetrics, requestsPerSecond } = useMetrics(2000);
	/* const [metrics, setMetrics] = useState<GlobalMetrics | null>(null);

	useEffect(() => {
		const interval = window.setInterval(() => {
			setMetrics(metricsCollector.getGlobalMetrics());
		}, 2000);

		return () => clearInterval(interval);
	}, []); */

	const [now] = useState(() => Date.now());

	const uptime = globalMetrics
		? Math.floor((now - now + (globalMetrics as any).timestamp) / 1000 / 60)
		: 0;
	const uptimeDisplay =
		uptime < 60
			? `${uptime}m`
			: uptime < 1440
				? `${Math.floor(uptime / 60)}h ${uptime % 60}m`
				: `${Math.floor(uptime / 1440)}d`;

	return (
		<div className="bg-slate-800 rounded-lg border border-slate-700 p-4 space-y-4">
			<h3 className="text-lg font-bold text-cyan-400">Core Status</h3>

			<div className="space-y-3">
				{/* Connected Status */}
				<div className="flex items-center gap-2">
					<StatusDot status="ok" animated={true} tooltip="System running" />
					<span className="text-sm">Connected</span>
				</div>

				{/* Uptime */}
				<div>
					<div className="text-xs text-slate-400">Uptime</div>
					<div className="text-lg font-mono text-blue-400">{uptimeDisplay}</div>
				</div>

				{/* Divider */}
				<div className="border-t border-slate-700" />

				{/* Metrics */}
				{globalMetrics && (
					<>
						<div>
							<div className="text-xs text-slate-400">Requests/sec</div>
							<div className="text-lg font-mono text-yellow-400">{requestsPerSecond.toFixed(1)}</div>
						</div>

						<div>
							<div className="text-xs text-slate-400">Avg Latency</div>
							<div className="text-lg font-mono text-yellow-400">{Math.round(globalMetrics.averageLatency)}ms</div>
						</div>

						<div>
							<div className="text-xs text-slate-400">Error Rate</div>
							<div
								className={`text-lg font-mono ${globalMetrics.globalErrorRate > 0.05 ? 'text-red-400' : 'text-green-400'}`}
							>
								{(globalMetrics.globalErrorRate * 100).toFixed(1)}%
							</div>
						</div>

						<div>
							<div className="text-xs text-slate-400">Active Agents</div>
							<div className="text-lg font-mono text-purple-400">{globalMetrics.activeAgents}</div>
						</div>

						<div>
							<div className="text-xs text-slate-400">Pending Tasks</div>
							<div className="text-lg font-mono text-orange-400">
								{metricsCollector.getPendingTasks().length}
							</div>
						</div>
					</>
				)}
			</div>
		</div>
	);
}
