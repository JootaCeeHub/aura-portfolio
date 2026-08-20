export const DASHBOARD_HTML = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AURA Core | Backend Monitor</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet">
    <style>
        body { font-family: 'Inter', sans-serif; }
        .glass { background: rgba(17, 24, 39, 0.7); backdrop-filter: blur(10px); border: 1px solid rgba(255, 255, 255, 0.1); }
        .data-row:hover { background: rgba(255, 255, 255, 0.05); }
        /* Custom Scrollbar */
        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-track { background: #1f2937; }
        ::-webkit-scrollbar-thumb { background: #4b5563; border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: #6b7280; }
    </style>
    <script>
        tailwind.config = {
            theme: {
                extend: {
                    colors: {
                        aura: {
                            base: '#0f172a',
                            surface: '#1e293b',
                            accent: '#38bdf8',
                            danger: '#ef4444',
                            success: '#22c55e',
                            warn: '#eab308'
                        }
                    }
                }
            }
        }
    </script>
</head>
<body class="bg-aura-base text-gray-200 min-h-screen">
    <!-- Navbar -->
    <nav class="border-b border-gray-800 bg-aura-base/90 fixed w-full z-10 backdrop-blur-md">
        <div class="max-w-8xl mx-auto px-6 h-16 flex items-center justify-between">
            <div class="flex items-center gap-4">
                <div class="w-2 h-8 bg-gradient-to-b from-aura-accent to-blue-600 rounded-full"></div>
                <h1 class="text-xl font-semibold tracking-tight text-white">AURA <span class="text-gray-500 font-light">Core Monitor</span></h1>
                <span class="px-2 py-0.5 text-xs rounded bg-gray-800 text-gray-400 border border-gray-700">v1.0.0</span>
            </div>
            <div class="flex items-center gap-6 text-sm">
                <div class="flex items-center gap-2">
                    <span class="w-2 h-2 rounded-full bg-aura-success animate-pulse"></span>
                    <span class="text-gray-400">System Online</span>
                </div>
                <div class="text-gray-500" id="clock">00:00:00</div>
            </div>
        </div>
    </nav>

    <main class="pt-24 pb-12 px-6 max-w-8xl mx-auto space-y-6">
        
        <!-- KPIs Row -->
        <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div class="glass rounded-xl p-5">
                <div class="text-gray-400 text-sm font-medium mb-1">Estado del Servidor</div>
                <div class="text-2xl font-semibold text-white flex items-center gap-2">
                    Running
                    <svg class="w-5 h-5 text-aura-success" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                </div>
                <div class="text-xs text-aura-accent mt-2" id="uptime">Uptime: 0s</div>
            </div>
            <div class="glass rounded-xl p-5">
                <div class="text-gray-400 text-sm font-medium mb-1">Total Requests</div>
                <div class="text-2xl font-semibold text-white" id="total-req">0</div>
                <div class="text-xs text-gray-500 mt-2">Desde inicio de sesión</div>
            </div>
            <div class="glass rounded-xl p-5">
                <div class="text-gray-400 text-sm font-medium mb-1">Velocidad Promedio</div>
                <div class="text-2xl font-semibold text-white" id="avg-latency">0ms</div>
                <div class="text-xs text-gray-500 mt-2">Latencia de respuesta</div>
            </div>
            <div class="glass rounded-xl p-5">
                <div class="text-gray-400 text-sm font-medium mb-1">Agentes Activos</div>
                <div class="text-2xl font-semibold text-white" id="active-agents">-</div>
                <div class="text-xs text-gray-500 mt-2">Módulos cargados</div>
            </div>
        </div>

        <!-- Main Content Grid -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px]">
            
            <!-- Live Logs Column (Takes 2/3) -->
            <div class="glass rounded-xl col-span-2 flex flex-col overflow-hidden">
                <div class="p-4 border-b border-gray-800 flex justify-between items-center bg-gray-900/50">
                    <h3 class="font-medium text-white flex items-center gap-2">
                        <svg class="w-4 h-4 text-aura-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                        Registro de Peticiones en Vivo
                    </h3>
                    <div class="flex gap-2">
                         <span class="px-2 py-1 rounded text-xs font-mono bg-black text-green-400 border border-green-900">LIVE</span>
                    </div>
                </div>
                
                <div class="flex-1 overflow-auto bg-[#0a0f18] p-0 font-mono text-sm relative">
                    <table class="w-full text-left border-collapse">
                        <thead class="sticky top-0 bg-gray-900 text-xs text-gray-400 uppercase tracking-wider shadow-sm z-10">
                            <tr>
                                <th class="p-3 font-medium">Hora</th>
                                <th class="p-3 font-medium">Método</th>
                                <th class="p-3 font-medium">Endpoint / RPC</th>
                                <th class="p-3 font-medium">Origen</th>
                                <th class="p-3 font-medium text-right">Latencia</th>
                                <th class="p-3 font-medium text-center">Estado</th>
                            </tr>
                        </thead>
                        <tbody id="logs-body" class="divide-y divide-gray-800 text-gray-300">
                           <!-- Rows injected via JS -->
                        </tbody>
                    </table>
                     <!-- Empty State -->
                    <div id="empty-state" class="absolute inset-0 flex flex-col items-center justify-center text-gray-600 pointer-events-none transition-opacity duration-300">
                        <svg class="w-12 h-12 mb-3 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                        <p class="text-sm">Esperando tráfico...</p>
                    </div>
                </div>
            </div>

            <!-- Side Metrics (Takes 1/3) -->
            <div class="flex flex-col gap-6">
                <!-- System Graph -->
                <div class="glass rounded-xl p-4 flex-1 flex flex-col">
                    <h3 class="font-medium text-white mb-4 text-sm">Carga del Sistema (Simulado)</h3>
                    <div class="flex-1 relative">
                        <canvas id="loadChart"></canvas>
                    </div>
                </div>

                <!-- Recent Events / Errors -->
                <div class="glass rounded-xl p-0 flex-1 flex flex-col overflow-hidden">
                    <div class="p-3 border-b border-gray-800 bg-gray-900/50">
                        <h3 class="font-medium text-white text-sm">Últimos Eventos</h3>
                    </div>
                    <div class="flex-1 overflow-auto p-3 space-y-2" id="events-list">
                         <!-- Events items -->
                    </div>
                </div>
            </div>
        </div>

    </main>

    <script>
        // --- Utils ---
        const formatTime = (ts) => new Date(ts).toLocaleTimeString('es-CL', { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit' });

        // --- Clock ---
        setInterval(() => {
            document.getElementById('clock').innerText = formatTime(new Date());
        }, 1000);

        // --- Charts ---
        const ctx = document.getElementById('loadChart').getContext('2d');
        const loadChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: Array(20).fill(''),
                datasets: [{
                    label: 'CPU Load',
                    data: Array(20).fill(0),
                    borderColor: '#38bdf8',
                    backgroundColor: 'rgba(56, 189, 248, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { display: false },
                    y: { display: true, min: 0, max: 100, grid: { color: 'rgba(255,255,255,0.05)' } }
                },
                animation: { duration: 0 }
            }
        });

        // --- Data Fetching ---
        const STATUS_URL = '/mcp/status'; // Reuse existing endpoint logic
        const METRICS_URL = '/requests/metrics'; // New endpoint we will improve
        const LOGS_URL = '/requests/recent';     // New endpoint for logs
        
        async function fetchSystemData() {
            try {
                // Fetch basic metrics
                const resMetrics = await fetch(METRICS_URL);
                if(resMetrics.ok) {
                    const data = await resMetrics.json();
                    document.getElementById('total-req').innerText = data.totalRequests;
                    document.getElementById('avg-latency').innerText = Math.round(data.averageLatency) + 'ms';
                    document.getElementById('uptime').innerText = 'Uptime: ' + Math.floor(data.uptime / 60) + 'm ' + Math.floor(data.uptime % 60) + 's';
                    
                    // Update Chart (Simulated variation based on requests for visual effect)
                    const load = Math.min(100, Math.max(5, (data.recentRequestRate || 0) * 10 + 5));
                    
                    const currentData = loadChart.data.datasets[0].data;
                    currentData.shift();
                    currentData.push(load);
                    loadChart.update();
                }

                // Fetch Logs
                const resLogs = await fetch(LOGS_URL);
                if(resLogs.ok) {
                    const logs = await resLogs.json();
                    renderLogs(logs);
                }

            } catch (e) {
                console.error("Dashboard poll error", e);
            }
        }

        function renderLogs(logs) {
            const tbody = document.getElementById('logs-body');
            const emptyState = document.getElementById('empty-state');
            
            if (logs.length === 0) {
                emptyState.style.opacity = '1';
                return;
            }
            emptyState.style.opacity = '0';
            
            // Diffing optimization: only rebuild if needed or simple rebuild for now
            tbody.innerHTML = logs.map(log => {
                const statusColor = log.status >= 500 ? 'text-aura-danger' : 
                                   log.status >= 400 ? 'text-aura-warn' : 
                                   'text-aura-success';
                
                const methodBadge = \`<span class="px-1.5 py-0.5 rounded text-[10px] font-bold border \${
                    log.method === 'POST' ? 'border-blue-900 bg-blue-900/20 text-blue-400' : 
                    log.method === 'GET' ? 'border-green-900 bg-green-900/20 text-green-400' :
                    'border-gray-700 bg-gray-800 text-gray-400'
                }">\${log.method}</span>\`;

                return \`
                    <tr class="data-row transition-colors border-b border-gray-800/50">
                        <td class="p-3 text-gray-500 whitespace-nowrap">\${formatTime(log.timestamp)}</td>
                        <td class="p-3">\${methodBadge}</td>
                        <td class="p-3 text-gray-300 font-medium">\${log.path}</td>
                        <td class="p-3 text-gray-500 text-xs">\${log.origin || '-'}</td>
                        <td class="p-3 text-right text-gray-400 font-mono">\${log.latency}ms</td>
                        <td class="p-3 text-center">
                            <span class="px-2 py-0.5 rounded-full bg-opacity-10 \${statusColor.replace('text-', 'bg-')} \${statusColor} text-xs font-bold ring-1 ring-inset ring-white/10">
                                \${log.status}
                            </span>
                        </td>
                    </tr>
                \`;
            }).join('');
        }

        // Init
        setInterval(fetchSystemData, 2000);
        fetchSystemData();

    </script>
</body>
</html>
`;
