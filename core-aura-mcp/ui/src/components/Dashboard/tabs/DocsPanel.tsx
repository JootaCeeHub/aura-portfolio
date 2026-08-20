import React, { useState } from 'react';

import { metricsCollector } from '../../../src/lib/metrics';

const agentDocs: Record<string, { description: string; tools: string[]; example: string }> = {
	orchestrator_core: {
		description: 'Coordinador central que orquesta flujos entre múltiples agentes.',
		tools: ['agents.list', 'agents.execute', 'tasks.queue', 'results.aggregate'],
		example: `
const orchestrator = new Agent('orchestrator_core');
const result = await orchestrator.execute({
  task: 'Diseñar arquitectura de app',
  agents: ['developer', 'trader'],
  deadline: '2h'
});
    `,
	},
	developer_core: {
		description: 'Especialista en análisis, refactorización y diseño de código.',
		tools: ['code.analyze', 'code.refactor', 'tests.generate', 'docs.generate'],
		example: `
const dev = new Agent('developer_core');
const refactored = await dev.execute({
  action: 'refactor',
  code: sourceCode,
  focus: 'performance'
});
    `,
	},
	trading_core: {
		description: 'Especialista en trading sistemático y análisis de mercados.',
		tools: ['market.data', 'backtest.run', 'risk.analyze', 'portfolio.optimize'],
		example: `
const trader = new Agent('trading_core');
const backtest = await trader.execute({
  strategy: 'momentum',
  market: 'EURUSD',
  period: '1y'
});
    `,
	},
	analyst_core: {
		description: 'Especialista en análisis de datos y visualización.',
		tools: ['data.query', 'data.transform', 'viz.generate', 'report.compile'],
		example: `
const analyst = new Agent('analyst_core');
const report = await analyst.execute({
  dataset: 'sales_2024',
  metrics: ['revenue', 'churn'],
  format: 'pdf'
});
    `,
	},
};

export default function DocsPanel() {
	const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
	const agentStats = metricsCollector.getAllAgentStats();

	return (
		<div className="space-y-6">
			<div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
				<h2 className="text-xl font-bold text-cyan-400 mb-4">Documentation & Usage</h2>

				{/* Agent List */}
				<div className="grid grid-cols-2 gap-4 mb-6">
					{agentStats.map((stat) => (
						<button
							key={stat.name}
							onClick={() => setSelectedAgent(selectedAgent === stat.name ? null : stat.name)}
							className={`p-4 rounded border-2 transition-colors text-left ${
								selectedAgent === stat.name
									? 'border-cyan-500 bg-cyan-500/10'
									: 'border-slate-600 hover:border-slate-500 bg-slate-700'
							}`}
						>
							<h4 className="text-cyan-400 font-bold">{stat.name}</h4>
							<p className="text-xs text-slate-400 mt-1">
								{agentDocs[stat.name]?.description ?? 'No documentation'}
							</p>
						</button>
					))}
				</div>

				{/* Agent Details */}
				{selectedAgent && agentDocs[selectedAgent] && (
					<div className="bg-slate-900 p-4 rounded border border-slate-600 space-y-4">
						<div>
							<h3 className="text-lg font-bold text-cyan-400 mb-2">{selectedAgent}</h3>
							<p className="text-slate-300">{agentDocs[selectedAgent].description}</p>
						</div>

						<div>
							<h4 className="text-sm font-bold text-yellow-400 mb-2">Available Tools</h4>
							<div className="flex flex-wrap gap-2">
								{agentDocs[selectedAgent].tools.map((tool) => (
									<span
										key={tool}
										className="px-2 py-1 bg-slate-700 text-slate-300 rounded text-xs"
									>
										{tool}
									</span>
								))}
							</div>
						</div>

						<div>
							<h4 className="text-sm font-bold text-green-400 mb-2">Example Usage</h4>
							<pre className="bg-slate-800 p-3 rounded text-xs text-slate-300 overflow-x-auto font-mono">
								{agentDocs[selectedAgent].example.trim()}
							</pre>
						</div>

						<div>
							<h4 className="text-sm font-bold text-purple-400 mb-2">Performance Stats</h4>
							<div className="grid grid-cols-4 gap-2">
								{(() => {
									const stat = agentStats.find((s) => s.name === selectedAgent);
									return stat ? (
										<>
											<div className="bg-slate-800 p-2 rounded">
												<div className="text-xs text-slate-400">Executions</div>
												<div className="text-yellow-400 font-bold">{stat.totalExecutions}</div>
											</div>
											<div className="bg-slate-800 p-2 rounded">
												<div className="text-xs text-slate-400">Avg Latency</div>
												<div className="text-yellow-400 font-bold">{Math.round(stat.averageLatency)}ms</div>
											</div>
											<div className="bg-slate-800 p-2 rounded">
												<div className="text-xs text-slate-400">Success Rate</div>
												<div className="text-green-400 font-bold">
													{((1 - stat.errorRate) * 100).toFixed(0)}%
												</div>
											</div>
											<div className="bg-slate-800 p-2 rounded">
												<div className="text-xs text-slate-400">p99 Latency</div>
												<div className="text-orange-400 font-bold">{Math.round(stat.p99Latency)}ms</div>
											</div>
										</>
									) : null;
								})()}
							</div>
						</div>
					</div>
				)}
			</div>

			{/* Getting Started */}
			<div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
				<h3 className="text-lg font-bold text-cyan-400 mb-4">Getting Started</h3>

				<div className="space-y-4 text-slate-300">
					<div>
						<h4 className="font-bold text-sm mb-2">1. Initialize Client</h4>
						<pre className="bg-slate-900 p-2 rounded text-xs font-mono text-slate-400">
							{`const client = new McpCoreClient('http://localhost:3000');
await client.connect();`}
						</pre>
					</div>

					<div>
						<h4 className="font-bold text-sm mb-2">2. List Available Agents</h4>
						<pre className="bg-slate-900 p-2 rounded text-xs font-mono text-slate-400">
							{`const agents = client.getAgents();
console.log(agents.map(a => a.name));`}
						</pre>
					</div>

					<div>
						<h4 className="font-bold text-sm mb-2">3. Execute Agent</h4>
						<pre className="bg-slate-900 p-2 rounded text-xs font-mono text-slate-400">
							{`const result = await client.executeAgent('developer_core', {
  action: 'analyze',
  code: '...'
});`}
						</pre>
					</div>
				</div>
			</div>
		</div>
	);
}
