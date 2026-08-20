import React, { useState } from 'react';

interface MCP {
	name: string;
	status: 'connected' | 'disconnected' | 'error';
	lastHeartbeat: number;
	toolsCount: number;
	version: string;
}

const mockMCPs: MCP[] = [
	{
		name: 'mcp-code-review',
		status: 'connected',
		lastHeartbeat: Date.now() - 5000,
		toolsCount: 4,
		version: '1.0.0',
	},
	{
		name: 'mcp-slack',
		status: 'connected',
		lastHeartbeat: Date.now() - 15000,
		toolsCount: 6,
		version: '0.9.0',
	},
	{
		name: 'mcp-jira',
		status: 'error',
		lastHeartbeat: Date.now() - 120000,
		toolsCount: 8,
		version: '1.0.1',
	},
];

export default function MCPsPanel() {
	const [mcps, setMcps] = useState<MCP[]>(mockMCPs);
	const [selectedMcp, setSelectedMcp] = useState<string | null>(null);
	const [now] = useState(() => Date.now());

	const formatLastHeartbeat = (ts: number): string => {
		const elapsed = now - ts;
		const seconds = Math.floor(elapsed / 1000);
		if (seconds < 60) return `${seconds}s ago`;
		const minutes = Math.floor(seconds / 60);
		if (minutes < 60) return `${minutes}m ago`;
		return `${Math.floor(minutes / 60)}h ago`;
	};

	const getStatusColor = (status: string): string => {
		return status === 'connected'
			? 'bg-green-900 text-green-400'
			: status === 'error'
				? 'bg-red-900 text-red-400'
				: 'bg-gray-900 text-gray-400';
	};

	const handleReconnect = (name: string) => {
		setMcps((prev) =>
			prev.map((m) => (m.name === name ? { ...m, status: 'connected', lastHeartbeat: Date.now() } : m))
		);
	};

	const handleRemove = (name: string) => {
		setMcps((prev) => prev.filter((m) => m.name !== name));
	};

	return (
		<div className="space-y-6">
			<div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
				<h2 className="text-xl font-bold text-cyan-400 mb-4">Integrations & MCPs</h2>

				<div className="overflow-x-auto">
					<table className="w-full text-sm font-mono">
						<thead className="border-b border-slate-700 text-slate-400">
							<tr>
								<th className="text-left py-2">Name</th>
								<th className="text-left py-2">Status</th>
								<th className="text-left py-2">Last Heartbeat</th>
								<th className="text-left py-2">Tools</th>
								<th className="text-left py-2">Version</th>
								<th className="text-left py-2">Actions</th>
							</tr>
						</thead>
						<tbody className="space-y-1">
							{mcps.map((mcp) => (
								<tr
									key={mcp.name}
									className="border-b border-slate-700 hover:bg-slate-700/50 cursor-pointer"
									onClick={() => setSelectedMcp(selectedMcp === mcp.name ? null : mcp.name)}
								>
									<td className="py-2 text-cyan-400">{mcp.name}</td>
									<td className="py-2">
										<span className={`px-2 py-1 rounded text-xs font-bold ${getStatusColor(mcp.status)}`}>
											{mcp.status.toUpperCase()}
										</span>
									</td>
									<td className="py-2 text-slate-400">{formatLastHeartbeat(mcp.lastHeartbeat)}</td>
									<td className="py-2 text-yellow-400">{mcp.toolsCount}</td>
									<td className="py-2 text-slate-400">{mcp.version}</td>
									<td className="py-2">
										<div className="flex gap-2">
											<button
												onClick={(e) => {
													e.stopPropagation();
													handleReconnect(mcp.name);
												}}
												className="px-2 py-1 bg-blue-600 hover:bg-blue-700 rounded text-xs"
											>
												Reconnect
											</button>
											<button
												onClick={(e) => {
													e.stopPropagation();
													handleRemove(mcp.name);
												}}
												className="px-2 py-1 bg-red-600 hover:bg-red-700 rounded text-xs"
											>
												Remove
											</button>
										</div>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>

				{/* Expanded MCP Details */}
				{selectedMcp && (
					<div className="mt-6 bg-slate-900 p-4 rounded border border-slate-600">
						<h3 className="text-lg font-bold text-cyan-400 mb-4">{selectedMcp} Configuration</h3>
						<div className="space-y-2 text-sm text-slate-300">
							<div>
								<span className="text-slate-500">Endpoint:</span> ws://localhost:3001/mcp/{selectedMcp}
							</div>
							<div>
								<span className="text-slate-500">Auth:</span> Bearer token (configured)
							</div>
							<div>
								<span className="text-slate-500">Health Check Interval:</span> 30s
							</div>
							<div>
								<span className="text-slate-500">Max Retries:</span> 3
							</div>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
