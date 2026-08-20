import React, { useState, useEffect, useMemo, useCallback } from 'react';

import { metricsCollector } from '../../../../src/lib/metrics';
import type { ExecutionMetric } from '../../../../src/lib/metrics';

type Props = {
	filter: { agent: string; level: string };
	onFilterChange: (filter: { agent: string; level: string }) => void;
	selectedAgent: string | null;
};

export default function LogsTimeline({ filter, onFilterChange }: Props) {
	const [logs, setLogs] = useState<ExecutionMetric[]>([]);
	const [allAgents, setAllAgents] = useState<string[]>([]);
	const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
	const [searchText, setSearchText] = useState('');
	const [debouncedSearch, setDebouncedSearch] = useState('');

	// Debounce search 300ms
	useEffect(() => {
		const timer = setTimeout(() => setDebouncedSearch(searchText), 300);
		return () => clearTimeout(timer);
	}, [searchText]);

	useEffect(() => {
		const unsub = metricsCollector.onExecutionRecorded((metric) => {
			setLogs((prev) => [metric, ...prev].slice(0, 50));
			setAllAgents((prev) => {
				const set = new Set([...prev, metric.agentName]);
				return Array.from(set).sort();
			});
		});

		const allStats = metricsCollector.getAllAgentStats();
		setAllAgents(allStats.map((s) => s.name).sort());

		return () => unsub();
	}, []);

	// Aplicar filtros
	const filtered = useMemo(() => {
		return logs.filter((log) => {
			if (filter.agent !== 'all' && log.agentName !== filter.agent) return false;
			if (debouncedSearch && !log.agentName.toLowerCase().includes(debouncedSearch.toLowerCase()))
				return false;
			return true;
		});
	}, [logs, filter, debouncedSearch]);

	const exportLogs = useCallback((format: 'json' | 'csv') => {
		const dataToExport = filtered.map((log) => ({
			timestamp: new Date(log.timestamp).toISOString(),
			agent: log.agentName,
			latency: log.latencyMs,
			status: log.success ? 'success' : 'failed',
			cid: log.correlationId || 'n/a',
		}));

		if (format === 'json') {
			const json = JSON.stringify(dataToExport, null, 2);
			const blob = new Blob([json], { type: 'application/json' });
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `logs-${Date.now()}.json`;
			a.click();
		} else if (format === 'csv') {
			const headers = ['Timestamp', 'Agent', 'Latency (ms)', 'Status', 'Correlation ID'];
			const rows = dataToExport.map((d) => [d.timestamp, d.agent, d.latency, d.status, d.cid]);
			const csv = [headers, ...rows].map((r) => r.join(',')).join('\n');
			const blob = new Blob([csv], { type: 'text/csv' });
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `logs-${Date.now()}.csv`;
			a.click();
		}
	}, [filtered]);

	const formatTime = (ts: number): string => {
		const d = new Date(ts);
		return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;
	};

	return (
		<div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
			<div className="flex justify-between items-center mb-4">
				<h3 className="text-lg font-bold text-cyan-400">Logs Timeline (Live)</h3>

				<div className="flex gap-3">
					<input
						type="text"
						placeholder="Search agents... (debounce 300ms)"
						value={searchText}
						onChange={(e) => setSearchText(e.target.value)}
						className="bg-slate-700 border border-slate-600 text-slate-50 px-3 py-1 rounded text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
					/>

					<select
						value={filter.agent}
						onChange={(e) => onFilterChange({ ...filter, agent: e.target.value })}
						className="bg-slate-700 border border-slate-600 text-slate-50 px-3 py-1 rounded text-sm"
					>
						<option value="all">All Agents</option>
						{allAgents.map((agent) => (
							<option key={agent} value={agent}>
								{agent}
							</option>
						))}
					</select>

					<button
						onClick={() => exportLogs('json')}
						className="px-3 py-1 bg-cyan-600 hover:bg-cyan-700 rounded text-xs font-bold transition-colors"
					>
						📥 JSON
					</button>
					<button
						onClick={() => exportLogs('csv')}
						className="px-3 py-1 bg-cyan-600 hover:bg-cyan-700 rounded text-xs font-bold transition-colors"
					>
						📊 CSV
					</button>
				</div>
			</div>

			{/* Timeline con expandibles */}
			<div className="bg-slate-900 p-4 rounded font-mono text-sm max-h-96 overflow-y-auto space-y-2">
				{filtered.length > 0 ? (
					filtered.map((log, idx) => {
						const logId = `${log.timestamp}-${idx}`;
						const isExpanded = expandedLogId === logId;

						return (
							<div
								key={logId}
								className="border-l-2 border-slate-700 pl-3 py-1 cursor-pointer hover:bg-slate-800 transition-all group"
								onClick={() => setExpandedLogId(isExpanded ? null : logId)}
							>
								{/* Main row */}
								<div className="flex gap-3 text-slate-300">
									<span className="text-slate-500 w-12 flex-shrink-0">{formatTime(log.timestamp)}</span>
									<span
										className={`font-bold w-4 flex-shrink-0 ${log.success ? 'text-green-400' : 'text-red-400'}`}
									>
										{log.success ? '✓' : '✕'}
									</span>
									<span className="text-cyan-400 flex-shrink-0">[{log.agentName}]</span>
									<span className="text-slate-400 flex-1">
										{log.success ? 'OK' : 'ERROR'} ({log.latencyMs}ms)
									</span>
									<span className="text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity">
										{isExpanded ? '▼' : '▶'}
									</span>
								</div>

								{/* Expanded */}
								{isExpanded && (
									<div className="mt-2 pt-2 border-t border-slate-700 pl-3 space-y-1 text-xs text-slate-300 animate-slideDown">
										<div>
											<span className="text-slate-500">Full ID:</span> {log.correlationId || 'n/a'}
										</div>
										<div>
											<span className="text-slate-500">Latency:</span> {log.latencyMs}ms
										</div>
										{log.errorMessage && (
											<div className="text-red-400">
												<span className="text-slate-500">Error:</span> {log.errorMessage}
											</div>
										)}
										{log.tokensUsed && (
											<div>
												<span className="text-slate-500">Tokens:</span> {log.tokensUsed}
											</div>
										)}
									</div>
								)}
							</div>
						);
					})
				) : (
					<div className="text-center text-slate-500 py-8">No logs matching filter</div>
				)}
			</div>
		</div>
	);
}
