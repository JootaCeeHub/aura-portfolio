import React, { useState } from 'react';

interface ConfigFile {
	name: string;
	content: Record<string, any>;
	version: number;
	lastModified: number;
}

const defaultConfig: ConfigFile = {
	name: 'aura-core.config.json',
	content: {
		core: {
			port: 3000,
			wsPath: '/ws',
			enableWs: true,
			pollingIntervalMs: 5000,
		},
		agents: {
			orchestrator: { enabled: true, temperature: 0.7, maxTokens: 2000 },
			developer: { enabled: true, temperature: 0.5, maxTokens: 4000 },
			trading: { enabled: true, temperature: 0.3, maxTokens: 3000 },
			analyst: { enabled: true, temperature: 0.6, maxTokens: 2500 },
		},
		logging: {
			level: 'debug',
			httpUrl: '',
			transports: ['memory', 'console'],
		},
	},
	version: 1,
	lastModified: Date.now(),
};

export default function ConfigEditor() {
	const [config, setConfig] = useState<ConfigFile>(defaultConfig);
	const [jsonStr, setJsonStr] = useState(JSON.stringify(config.content, null, 2));
	const [isDirty, setIsDirty] = useState(false);
	const [saveMessage, setSaveMessage] = useState<string | null>(null);

	const handleJsonChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
		setJsonStr(e.target.value);
		setIsDirty(true);
	};

	const handleSave = () => {
		try {
			const parsed = JSON.parse(jsonStr);
			setConfig({
				...config,
				content: parsed,
				version: config.version + 1,
				lastModified: Date.now(),
			});
			setIsDirty(false);
			setSaveMessage('✓ Config saved successfully');
			setTimeout(() => setSaveMessage(null), 3000);
		} catch (err) {
			setSaveMessage(`✕ JSON Error: ${(err as Error).message}`);
		}
	};

	const handleRevert = () => {
		setJsonStr(JSON.stringify(config.content, null, 2));
		setIsDirty(false);
	};

	const handleFormat = () => {
		try {
			const parsed = JSON.parse(jsonStr);
			setJsonStr(JSON.stringify(parsed, null, 2));
		} catch (err) {
			setSaveMessage(`✕ Format Error: ${(err as Error).message}`);
		}
	};

	return (
		<div className="space-y-6">
			<div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
				<div className="flex justify-between items-center mb-4">
					<div>
						<h3 className="text-lg font-bold text-cyan-400">{config.name}</h3>
						<div className="text-xs text-slate-400 mt-1">
							Version {config.version} • Modified{' '}
							{new Date(config.lastModified).toLocaleString()}
						</div>
					</div>

					<div className="flex gap-2">
						<button
							onClick={handleFormat}
							className="px-3 py-1 bg-slate-600 hover:bg-slate-700 rounded text-sm"
						>
							✨ Format
						</button>
						<button
							onClick={handleRevert}
							disabled={!isDirty}
							className="px-3 py-1 bg-slate-600 hover:bg-slate-700 disabled:opacity-50 rounded text-sm"
						>
							↶ Revert
						</button>
						<button
							onClick={handleSave}
							disabled={!isDirty}
							className="px-3 py-1 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 rounded text-sm font-bold"
						>
							💾 Save
						</button>
					</div>
				</div>

				{saveMessage && (
					<div
						className={`mb-4 p-2 rounded text-sm ${
							saveMessage.startsWith('✓')
								? 'bg-green-900 text-green-400'
								: 'bg-red-900 text-red-400'
						}`}
					>
						{saveMessage}
					</div>
				)}

				{/* JSON Editor */}
				<textarea
					value={jsonStr}
					onChange={handleJsonChange}
					className="w-full h-96 bg-slate-900 text-slate-50 p-4 rounded border border-slate-600 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
					spellCheck="false"
				/>
			</div>

			{/* Version History */}
			<div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
				<h3 className="text-lg font-bold text-cyan-400 mb-4">Version History</h3>

				<div className="space-y-2">
					{[config.version, config.version - 1, config.version - 2].map((v) => (
						<div key={v} className="flex justify-between items-center bg-slate-700 p-2 rounded">
							<div>
								<span className="text-cyan-400 font-bold">v{v}</span>
								{v === config.version && (
									<span className="ml-2 text-green-400 text-xs">(current)</span>
								)}
							</div>
							<button className="px-2 py-1 bg-slate-600 hover:bg-slate-500 rounded text-xs">
								Compare
							</button>
						</div>
					))}
				</div>
			</div>
		</div>
	);
}
