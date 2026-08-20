import React, { useState } from 'react';

import CoreStatusPanel from './CoreStatusPanel';
import AgentOrchestrationMap from './AgentOrchestrationMap';
import RecentExecutions from './RecentExecutions';
import LogsTimeline from './LogsTimeline';
import TaskQueue from './TaskQueue';
import AgentCard from './AgentCard';
import MCPsPanel from './tabs/MCPsPanel';
import PerformancePanel from './tabs/PerformancePanel';
import ConfigEditor from './tabs/ConfigEditor';
import DocsPanel from './tabs/DocsPanel';
import { useMetrics } from '../../hooks/useMetrics';
import { usePreferences } from '../../hooks/usePreferences';
// import type { AgentStats } from '../../src/lib/metrics';

type TabType = 'dashboard' | 'mcps' | 'performance' | 'config' | 'docs';

export default function DashboardLayout() {
	const [activeTab, setActiveTab] = useState<TabType>('dashboard');
	const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
	const [logFilter, setLogFilter] = useState({ agent: 'all', level: 'all' });
	const { agentStats } = useMetrics(2000);
	const { prefs, toggleDarkMode } = usePreferences();

	return (
		<div className={prefs.darkMode ? 'dark' : ''}>
			<div className="min-h-screen bg-slate-950 text-slate-50">
				{/* Header con Tabs */}
				<header className="bg-slate-900 border-b border-slate-700">
					<div className="px-6 py-4 flex justify-between items-center mb-4">
						<div className="flex items-center gap-3">
							<h1 className="text-2xl font-bold text-cyan-400">AURA MCP</h1>
							<nav className="text-sm text-slate-400">
								{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
								{selectedAgent && ` > ${selectedAgent}`}
							</nav>
						</div>
						<button
							onClick={toggleDarkMode}
							className="px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded text-sm transition-colors"
						>
							{prefs.darkMode ? '☀️' : '🌙'}
						</button>
					</div>

					{/* Tabs Navigation */}
					<div className="flex border-t border-slate-700 px-6">
						{(['dashboard', 'mcps', 'performance', 'config', 'docs'] as TabType[]).map((tab) => (
							<button
								key={tab}
								onClick={() => setActiveTab(tab)}
								className={`px-4 py-3 text-sm font-medium transition-colors ${activeTab === tab
										? 'border-b-2 border-cyan-400 text-cyan-400'
										: 'text-slate-400 hover:text-slate-300'
									}`}
							>
								{tab === 'dashboard' && '📊 Dashboard'}
								{tab === 'mcps' && '🔌 MCPs'}
								{tab === 'performance' && '⚡ Performance'}
								{tab === 'config' && '⚙️ Config'}
								{tab === 'docs' && '📚 Docs'}
							</button>
						))}
					</div>
				</header>

				{/* Main Content */}
				<main className="p-6">
					{activeTab === 'dashboard' && (
						<div className="space-y-6">
							{/* Top Row: Status + Orchestration */}
							<div className="grid grid-cols-4 gap-6">
								<div className="col-span-1">
									<CoreStatusPanel />
								</div>
								<div className="col-span-3">
									<AgentOrchestrationMap onAgentSelect={setSelectedAgent} selectedAgent={selectedAgent} />
								</div>
							</div>

							{/* Agent Cards Grid */}
							<div>
								<h2 className="text-lg font-bold text-cyan-400 mb-4">Active Agents</h2>
								<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
									{agentStats.map((stats) => (
										<AgentCard
											key={stats.name}
											agentName={stats.name}
											stats={stats}
											onClick={() => setSelectedAgent(stats.name)}
											selected={selectedAgent === stats.name}
										/>
									))}
								</div>
							</div>

							{/* Task Queue + Recent Executions */}
							<div className="grid grid-cols-2 gap-6">
								<TaskQueue />
								<RecentExecutions selectedAgent={selectedAgent} />
							</div>

							{/* Logs Timeline */}
							<div>
								<LogsTimeline
									filter={logFilter}
									onFilterChange={setLogFilter}
									selectedAgent={selectedAgent}
								/>
							</div>
						</div>
					)}

					{activeTab === 'mcps' && <MCPsPanel />}
					{activeTab === 'performance' && <PerformancePanel selectedAgent={selectedAgent} />}
					{activeTab === 'config' && <ConfigEditor />}
					{activeTab === 'docs' && <DocsPanel />}
				</main>
			</div>
		</div>
	);
}
