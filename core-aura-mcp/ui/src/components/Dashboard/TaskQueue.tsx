import React, { useState, useEffect } from 'react';

import { metricsCollector } from '../../../../src/lib/metrics';
import type { TaskQueueItem } from '../../../../src/lib/metrics';
import StatusDot from './StatusDot';

export default function TaskQueue() {
	const [tasks, setTasks] = useState<TaskQueueItem[]>([]);
	const [expanded, setExpanded] = useState<string | null>(null);
	const [now] = useState(() => Date.now());

	useEffect(() => {
		const interval = window.setInterval(() => {
			setTasks(metricsCollector.getPendingTasks());
		}, 500);

		return () => clearInterval(interval);
	}, []);

	const formatTime = (ts: number): string => {
		const elapsed = now - ts;
		const seconds = Math.floor(elapsed / 1000);
		const minutes = Math.floor(seconds / 60);

		if (minutes > 0) return `${minutes}m ago`;
		return `${seconds}s ago`;
	};

	const statusIcon = (status: string) => {
		switch (status) {
			case 'pending':
				return '⏳';
			case 'executing':
				return '⟳';
			case 'completed':
				return '✓';
			case 'failed':
				return '✕';
			default:
				return '?';
		}
	};

	return (
		<div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
			<h3 className="text-lg font-bold text-cyan-400 mb-4">
				Task Queue <span className="text-sm text-slate-400">({tasks.length})</span>
			</h3>

			{tasks.length > 0 ? (
				<div className="space-y-2 max-h-64 overflow-y-auto">
					{tasks.map((task) => (
						<div
							key={task.id}
							className="bg-slate-700 rounded p-2 cursor-pointer hover:bg-slate-600 transition-colors"
							onClick={() => setExpanded(expanded === task.id ? null : task.id)}
						>
							<div className="flex items-center gap-2 text-sm">
								<StatusDot status={task.status === 'executing' ? 'executing' : 'warning'} animated={true} />
								<span className="font-mono text-xs text-slate-400">{statusIcon(task.status)}</span>
								<span className="text-cyan-400 font-bold flex-1">{task.agentName}</span>
								<span className="text-xs text-slate-500">{formatTime(task.createdAt)}</span>
							</div>

							{/* Expanded */}
							{expanded === task.id && (
								<div className="mt-2 pt-2 border-t border-slate-600 text-xs text-slate-300">
									<div className="break-all">Input: {task.input.slice(0, 100)}...</div>
									<div>ID: <span className="font-mono">{task.id.slice(0, 8)}</span></div>
								</div>
							)}
						</div>
					))}
				</div>
			) : (
				<div className="text-center text-slate-500 py-4">No pending tasks</div>
			)}
		</div>
	);
}
