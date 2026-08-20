import { useEffect, useState, useCallback } from 'react';

import { metricsCollector } from '../../../src/lib/metrics';
import type { GlobalMetrics, AgentStats } from '../../../src/lib/metrics';

export function useMetrics(refreshIntervalMs = 2000) {
	const [globalMetrics, setGlobalMetrics] = useState<GlobalMetrics | null>(null);
	const [agentStats, setAgentStats] = useState<AgentStats[]>([]);
	const [requestsPerSecond, setRequestsPerSecond] = useState(0);

	const refresh = useCallback(() => {
		setGlobalMetrics(metricsCollector.getGlobalMetrics());
		setAgentStats(metricsCollector.getAllAgentStats());
		setRequestsPerSecond(metricsCollector.getRequestsPerSecond() as number);
	}, []);

	useEffect(() => {
		refresh();
		const interval = window.setInterval(refresh, refreshIntervalMs);

		return () => clearInterval(interval);
	}, [refreshIntervalMs, refresh]);

	return {
		globalMetrics,
		agentStats,
		requestsPerSecond,
		refresh,
	};
}

export function useAgentDetails(agentName: string | null) {
	const [details, setDetails] = useState<any>(null);

	useEffect(() => {
		if (!agentName) {
			setDetails(null);
			return;
		}

		const interval = window.setInterval(() => {
			const stats = metricsCollector.getAgentStatsEnhanced(agentName);
			setDetails(stats);
		}, 2000);

		setDetails(metricsCollector.getAgentStatsEnhanced(agentName));
		return () => clearInterval(interval);
	}, [agentName]);

	return details;
}
