import React, { useState, useEffect } from 'react';

import { metricsCollector } from '../../src/lib/metrics';
import type { ExecutionMetric } from '../../src/lib/metrics';

type Props = {
	selectedAgent: string | null;
};

export default function RecentExecutions({ selectedAgent }: Props) {
	const [executions, setExecutions] = useState<ExecutionMetric[]>([]);

	useEffect(() => {
		const unsub = metricsCollector.onExecutionRecorded((metric) => {
			setExecutions((prev) => [metric, ...prev].slice(0, 10)); // últimas 10
		});

		return () => unsub();
	}, []);

	const filtered = selectedAgent ? executions.filter((e) => e.agentName === selectedAgent) : executions;

	const formatTime = (ts: number): string => {
		const d = new Date(ts);
		return d.toLocaleTimeString();
	};

	return (
		<div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
			<h3 className="text-lg font-bold text-cyan-400 mb-4">Recent Executions {selectedAgent && `(${selectedAgent})`}</h3>

			<div className="overflow-x-auto">
				<table className="w-full text-sm font-mono">
					<thead className="border-b border-slate-700 text-slate-400">
						<tr>
							<th className="text-left py-2">Time</th>
							<th className="text-left py-2">Agent</th>
							<th className="text-left py-2">Latency</th>
							<th className="text-left py-2">Status</th>
							<th className="text-left py-2">CID</th>
						</tr>
					</thead>
					<tbody className="space-y-1">
						{filtered.length > 0 ? (
							filtered.map((exec, idx) => (
								<tr key={idx} className="border-b border-slate-700 hover:bg-slate-700/50">
									<td className="py-2 text-slate-400">{formatTime(exec.timestamp)}</td>
									<td className="py-2 text-cyan-400">{exec.agentName}</td>
									<td className="py-2 text-yellow-400">{exec.latencyMs}ms</td>
									<td className="py-2">
										<span className={exec.success ? 'text-green-400' : 'text-red-400'}>
											{exec.success ? '✓' : '✕'}
										</span>
									</td>
									<td className="py-2 text-slate-500 text-xs">{exec.correlationId?.slice(0, 8) || '-'}</td>
								</tr>
							))
						) : (
							<tr>
								<td colSpan={5} className="py-4 text-center text-slate-500">
									No executions yet
								</td>
							</tr>
						)}
					</tbody>
				</table>
			</div>
		</div>
	);
}
