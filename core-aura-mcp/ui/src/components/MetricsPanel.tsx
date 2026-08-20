import React, { useState, useEffect } from 'react';
import type { GlobalMetrics, AgentStats, MetricAlert } from '../../../src/lib/metrics';
import { metricsCollector } from '../../../src/lib/metrics';

type Props = {
	refreshIntervalMs?: number;
	showAlerts?: boolean;
};

export default function MetricsPanel({ refreshIntervalMs = 2000, showAlerts = true }: Props) {
	const [globalMetrics, setGlobalMetrics] = useState<GlobalMetrics | null>(null);
	const [agentStats, setAgentStats] = useState<AgentStats[]>([]);
	const [alerts, setAlerts] = useState<MetricAlert[]>([]);
	const [lastRefresh, setLastRefresh] = useState<number>(() => Date.now());

	useEffect(() => {
		const interval = window.setInterval(() => {
			setGlobalMetrics(metricsCollector.getGlobalMetrics());
			setAgentStats(metricsCollector.getAllAgentStats());
			if (showAlerts) {
				setAlerts(metricsCollector.getAlerts());
			}
			setLastRefresh(Date.now());
		}, refreshIntervalMs);

		// Suscribirse a alertas nuevas en tiempo real
		const unsubAlert = metricsCollector.onAlertCreated((alert) => {
			if (showAlerts) {
				setAlerts((prev) => [alert, ...prev].slice(0, 10)); // últimas 10 alertas
			}
		});

		return () => {
			clearInterval(interval);
			unsubAlert();
		};
	}, [refreshIntervalMs, showAlerts]);

	const formatLatency = (ms: number): string => {
		if (ms < 1000) return `${Math.round(ms)}ms`;
		return `${(ms / 1000).toFixed(2)}s`;
	};

	const formatPercent = (value: number): string => `${(value * 100).toFixed(1)}%`;

	const renderMiniChart = (value: number, max: number = 100): string => {
		const filled = Math.round((value / max) * 10);
		return '█'.repeat(filled) + '░'.repeat(10 - filled);
	};

	const getSeverityColor = (severity: string): string => {
		return severity === 'critical' ? 'text-red-500 font-bold' : 'text-yellow-500';
	};

	return (
		<div className="p-4 bg-slate-900 text-slate-50 font-mono text-sm rounded space-y-6">
			{/* Alertas */}
			{showAlerts && alerts.length > 0 && (
				<div>
					<h2 className="text-lg font-bold mb-3 border-b border-red-700 pb-2">
						⚠️ Alertas Activas ({alerts.length})
					</h2>
					<div className="space-y-2">
						{alerts.map((alert) => (
							<div
								key={alert.id}
								className={`p-2 rounded border-l-4 ${alert.severity === 'critical'
										? 'border-red-500 bg-red-900/20'
										: 'border-yellow-500 bg-yellow-900/20'
									}`}
							>
								<div className="flex justify-between items-start">
									<div>
										<div className={`font-bold ${getSeverityColor(alert.severity)}`}>
											{alert.type.toUpperCase()}
										</div>
										<div className="text-xs text-slate-300">{alert.message}</div>
										{alert.agentName && (
											<div className="text-xs text-slate-400">Agent: {alert.agentName}</div>
										)}
									</div>
									<div className="text-xs text-slate-400">
										{new Date(alert.timestamp).toLocaleTimeString()}
									</div>
								</div>
							</div>
						))}
					</div>
				</div>
			)}

			{/* Global Metrics */}
			<div>
				<h2 className="text-lg font-bold mb-3 border-b border-slate-700 pb-2">
					🔍 Global Metrics
				</h2>

				{globalMetrics ? (
					<div className="space-y-2">
						<div className="flex justify-between">
							<span>Total Executions</span>
							<span className="font-bold text-blue-400">{globalMetrics.totalExecutions}</span>
						</div>
						<div className="flex justify-between">
							<span>Total Errors</span>
							<span
								className={globalMetrics.totalErrors > 0 ? 'font-bold text-red-400' : 'text-green-400'}
							>
								{globalMetrics.totalErrors}
							</span>
						</div>
						<div className="flex justify-between items-center">
							<span>Error Rate</span>
							<div className="flex items-center gap-2">
								<span
									className={globalMetrics.globalErrorRate > 0.05 ? 'text-red-400' : 'text-green-400'}
								>
									{formatPercent(globalMetrics.globalErrorRate)}
								</span>
								<span className="text-xs text-slate-500">
									{renderMiniChart(globalMetrics.globalErrorRate * 100, 10)}
								</span>
							</div>
						</div>
						<div className="flex justify-between">
							<span>Avg Latency</span>
							<span className="text-yellow-400">{formatLatency(globalMetrics.averageLatency)}</span>
						</div>
						<div className="flex justify-between">
							<span>Active Agents</span>
							<span className="text-purple-400">{globalMetrics.activeAgents}</span>
						</div>
						<div className="flex justify-between">
							<span>Reconnection Attempts</span>
							<span
								className={
									globalMetrics.reconnectionAttempts > 0 ? 'text-orange-400' : 'text-green-400'
								}
							>
								{globalMetrics.reconnectionAttempts}
							</span>
						</div>
					</div>
				) : (
					<div className="text-slate-400">No metrics available</div>
				)}
			</div>

			{/* Agent Metrics */}
			<div>
				<h2 className="text-lg font-bold mb-3 border-b border-slate-700 pb-2">
					📊 Agent Metrics
				</h2>

				{agentStats.length > 0 ? (
					<div className="space-y-4">
						{agentStats.map((stat) => (
							<div
								key={stat.name}
								className={`bg-slate-800 p-3 rounded border ${stat.errorRate > 0.05 ? 'border-red-700' : 'border-slate-700'
									}`}
							>
								<div className="font-bold text-cyan-400 mb-2">{stat.name}</div>

								<div className="grid grid-cols-2 gap-2 text-xs">
									<div className="flex justify-between">
										<span>Executions</span>
										<span className="text-blue-400">{stat.totalExecutions}</span>
									</div>
									<div className="flex justify-between">
										<span>Success Rate</span>
										<span
											className={stat.errorRate < 0.05 ? 'text-green-400' : 'text-orange-400'}
										>
											{formatPercent(1 - stat.errorRate)}
										</span>
									</div>
									<div className="flex justify-between">
										<span>Avg Latency</span>
										<span className="text-yellow-400">{formatLatency(stat.averageLatency)}</span>
									</div>
									<div className="flex justify-between">
										<span>p99 Latency</span>
										<span
											className={stat.p99Latency > 500 ? 'text-orange-400' : 'text-slate-300'}
										>
											{formatLatency(stat.p99Latency)}
										</span>
									</div>
									<div className="col-span-2 flex justify-between">
										<span>Min/Max</span>
										<span className="text-slate-400">
											{formatLatency(stat.minLatency)} / {formatLatency(stat.maxLatency)}
										</span>
									</div>
								</div>

								<div className="mt-2 pt-2 border-t border-slate-600">
									<div className="flex items-center gap-2 text-xs">
										<span className="w-16">Latency</span>
										<span className="flex-1 text-slate-400">
											{renderMiniChart(stat.p95Latency, Math.max(100, stat.p99Latency * 1.5))}
										</span>
									</div>
								</div>
							</div>
						))}
					</div>
				) : (
					<div className="text-slate-400">No agent metrics available</div>
				)}
			</div>

			<div className="mt-4 pt-4 border-t border-slate-700 text-xs text-slate-400">
				Last updated: {new Date(lastRefresh).toLocaleTimeString()}
			</div>
		</div>
	);
}
