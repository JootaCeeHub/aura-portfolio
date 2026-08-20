import { useState, useCallback } from 'react';

export type Preferences = {
	darkMode: boolean;
	visibleColumns: string[];
	autoRefresh: boolean;
	expandedAgents: string[];
};

const STORAGE_KEY = 'aura-dashboard-prefs';

const DEFAULT_PREFS: Preferences = {
	darkMode: true,
	visibleColumns: ['executions', 'latency', 'successRate'],
	autoRefresh: true,
	expandedAgents: [],
};

export function usePreferences() {
	const [prefs, setPrefs] = useState<Preferences>(() => {
		try {
			const stored = localStorage.getItem(STORAGE_KEY);
			return stored ? { ...DEFAULT_PREFS, ...JSON.parse(stored) } : DEFAULT_PREFS;
		} catch {
			return DEFAULT_PREFS;
		}
	});

	const updatePrefs = useCallback((updater: Partial<Preferences> | ((p: Preferences) => Preferences)) => {
		setPrefs((prev) => {
			const next = typeof updater === 'function' ? updater(prev) : { ...prev, ...updater };
			try {
				localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
			} catch {
				console.warn('Failed to save preferences');
			}
			return next;
		});
	}, []);

	const toggleDarkMode = useCallback(() => {
		updatePrefs((p) => ({ ...p, darkMode: !p.darkMode }));
	}, [updatePrefs]);

	const toggleColumnVisibility = useCallback((col: string) => {
		updatePrefs((p) => ({
			...p,
			visibleColumns: p.visibleColumns.includes(col)
				? p.visibleColumns.filter((c) => c !== col)
				: [...p.visibleColumns, col],
		}));
	}, [updatePrefs]);

	const toggleAgentExpanded = useCallback((agentName: string) => {
		updatePrefs((p) => ({
			...p,
			expandedAgents: p.expandedAgents.includes(agentName)
				? p.expandedAgents.filter((a) => a !== agentName)
				: [...p.expandedAgents, agentName],
		}));
	}, [updatePrefs]);

	return {
		prefs,
		updatePrefs,
		toggleDarkMode,
		toggleColumnVisibility,
		toggleAgentExpanded,
	};
}
