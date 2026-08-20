import React, { useMemo } from 'react';

import { metricsCollector } from '../../../../../src/lib/metrics';



export default function PerformancePanel() {
	const allStats = metricsCollector.getAllAgentStats();

	// Simular datos históricos (en prod, desde base de datos)
	/* const [latencyTrend, setLatencyTrend] = useState<any[]>([]);

	useEffect(() => {
		const data = [];
		const baseTime = Date.now();
		for (let i = 0; i < 20; i++) {
			data.push({
				time: new Date(baseTime - (20 - i) * 10000).toLocaleTimeString(),
				latency: Math.random() * 200 + 50,
				errorRate: Math.random() * 0.1,
			});
		}
		setLatencyTrend(data);
	}, []); */

	// Heatmap: agentes x herramientas
	const heatmapData = useMemo(() => {
		const tools = [
			'code.analyze',
			'code.refactor',
			'backtest.run',
			'data.query',
			'data.transform',
			'viz.generate',
		];
		return allStats.map((agent) => ({
			agent: agent.name,
			metrics: tools.map((tool) => ({
				tool,
				avgLatency: Math.random() * 300 + 50,
				successRate: Math.random() * 0.95 + 0.05,
			})),
		}));
	}, [allStats]);

	return (
		<div className="space-y-6">
			{/* Latency Trend */}
			<div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
				<h3 className="text-lg font-bold text-cyan-400 mb-4">Latency Trend (Last 20 min)</h3>

				{/* Simple ASCII Chart */}
				<div className="bg-slate-900 p-4 rounded font-mono text-xs text-slate-300 overflow-x-auto">
					<div className="whitespace-pre">
						{`
    Latency (ms)
    │
 300│     ╱╲        ╱╲
    │    ╱  ╲      ╱  ╲
 200│   ╱    ╲    ╱    ╲
    │  ╱      ╲  ╱      ╲
 100│ ╱        ╲╱        ╲
    │╱                    ╲
   0└────────────────────────→ Time
    10:00  10:05  10:10  10:15
        `}
					</div>
				</div>

				{/* Stats */}
				<div className="mt-4 grid grid-cols-4 gap-4">
					<div className="bg-slate-700 p-3 rounded">
						<div className="text-slate-400 text-xs">Min Latency</div>
						<div className="text-yellow-400 font-bold">45ms</div>
					</div>
					<div className="bg-slate-700 p-3 rounded">
						<div className="text-slate-400 text-xs">Max Latency</div>
						<div className="text-orange-400 font-bold">287ms</div>
					</div>
					<div className="bg-slate-700 p-3 rounded">
						<div className="text-slate-400 text-xs">Avg Latency</div>
						<div className="text-blue-400 font-bold">125ms</div>
					</div>
					<div className="bg-slate-700 p-3 rounded">
						<div className="text-slate-400 text-xs">p99 Latency</div>
						<div className="text-red-400 font-bold">267ms</div>
					</div>
				</div>
			</div>

			{/* Performance Heatmap */}
			<div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
				<h3 className="text-lg font-bold text-cyan-400 mb-4">Agent × Tool Performance Heatmap</h3>

				<div className="overflow-x-auto">
					<table className="w-full text-xs">
						<thead className="border-b border-slate-700 text-slate-400">
							<tr>
								<th className="text-left py-2 px-2">Agent / Tool</th>
								{heatmapData[0]?.metrics.slice(0, 3).map((m) => (
									<th key={m.tool} className="text-center py-2 px-2">
										{m.tool.split('.')[1]}
									</th>
								))}
							</tr>
						</thead>
						<tbody>
							{heatmapData.slice(0, 4).map((agent) => (
								<tr key={agent.agent} className="border-b border-slate-700">
									<td className="py-2 px-2 text-cyan-400">{agent.agent}</td>
									{agent.metrics.slice(0, 3).map((m: { tool: string; avgLatency: number; successRate: number }, idx) => {
										const intensity = m.avgLatency / 300;
										const bgColor =
											intensity < 0.33
												? 'bg-green-900'
												: intensity < 0.66
													? 'bg-yellow-900'
													: 'bg-red-900';
										return (
											<td key={idx} className={`py-2 px-2 text-center ${bgColor} text-slate-200`}>
												{Math.round(m.avgLatency)}ms
											</td>
										);
									})}
								</tr>
							))}
						</tbody>
					</table>
				</div>

				<div className="mt-4 text-xs text-slate-400">
					Green: &lt; 100ms | Yellow: 100-200ms | Red: &gt; 200ms
				</div>
			</div>

			{/* Top Slowest Agents */}
			<div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
				<h3 className="text-lg font-bold text-cyan-400 mb-4">Top Slowest Agents</h3>

				<div className="space-y-2">
					{allStats
						.sort((a, b) => b.p99Latency - a.p99Latency)
						.slice(0, 5)
						.map((agent, idx) => (
							<div key={agent.name} className="flex justify-between items-center bg-slate-700 p-2 rounded">
								<div className="flex items-center gap-2">
									<span className="text-slate-400 text-xs">{idx + 1}.</span>
									<span className="text-cyan-400">{agent.name}</span>
								</div>
								<div className="flex gap-4">
									<span className="text-orange-400">p99: {Math.round(agent.p99Latency)}ms</span>
									<span className="text-yellow-400">avg: {Math.round(agent.averageLatency)}ms</span>
								</div>
							</div>
						))}
				</div>
			</div>
		</div>
	);
}
