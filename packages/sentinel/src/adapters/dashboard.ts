/**
 * @file dashboard.ts
 * Embedded Security Observability Manager Dashboard Handler for AMEVA-Sentinel.
 * Features OpenStreetMap (OSM) tiles, 9 English Continent Viewports, and Country/City Pinpoint Plotting (including Gabon/GA).
 */

export interface SentinelDashboardOptions {
  title?: string;
  theme?: 'light' | 'dark' | 'auto';
  apiEndpoint?: string;
  customCss?: string;
}

export function getSentinelDashboardHtml(options: SentinelDashboardOptions = {}): string {
  const title = options.title || 'AMEVA-Sentinel Security Observability Manager';
  const apiEndpoint = options.apiEndpoint || '/sentinel/events';

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <link rel="icon" type="image/svg+xml" href="https://uno-km.vercel.app/shared/brand/favicon.svg">
    <!-- Leaflet OpenStreetMap Engine -->
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=" crossorigin=""/>
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=" crossorigin=""></script>
    <style>
        :root {
            --primary-color: #004499;
            --primary-dark: #002b66;
            --primary-light: #e8f0fe;
            --border-color: #cbd5e1;
            --text-main: #0f172a;
            --text-muted: #475569;
            --font-mono: "JetBrains Mono", Consolas, "Liberation Mono", Menlo, Courier, monospace;
        }

        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            background-color: #f8fafc;
            color: var(--text-main);
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            font-size: 13px;
            line-height: 1.5;
        }

        header {
            background-color: #ffffff;
            border-bottom: 2px solid var(--primary-color);
            padding: 0 24px;
            height: 58px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            position: sticky;
            top: 0;
            z-index: 1000;
            box-shadow: 0 1px 4px rgba(0,0,0,0.04);
        }
        .header-brand { display: flex; align-items: center; gap: 10px; text-decoration: none; }
        .header-brand img { width: 26px; height: 26px; }
        .header-brand h1 { margin: 0; color: var(--primary-color); font-size: 1.2em; font-weight: 700; }
        .header-controls { display: flex; align-items: center; gap: 8px; }
        .header-btn {
            background: #ffffff;
            border: 1px solid var(--border-color);
            color: var(--text-main);
            padding: 5px 10px;
            font-size: 0.85em;
            font-weight: 600;
            border-radius: 3px;
            text-decoration: none;
            display: inline-flex;
            align-items: center;
            gap: 4px;
        }
        .header-btn:hover { background: #f1f5f9; color: var(--primary-color); border-color: var(--primary-color); }
        .header-btn.primary { background: var(--primary-color); color: #fff; border-color: var(--primary-color); }

        .tomcat-container {
            max-width: 1380px;
            margin: 20px auto 40px auto;
            padding: 0 20px;
            display: flex;
            flex-direction: column;
            gap: 16px;
        }

        .status-header-box {
            background: #ffffff;
            border: 1px solid var(--border-color);
            border-left: 4px solid var(--primary-color);
            padding: 12px 18px;
            border-radius: 4px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 10px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.03);
        }

        .status-title { font-size: 1.15em; font-weight: 800; color: var(--primary-color); display: flex; align-items: center; gap: 8px; }
        .tomcat-badge { display: inline-block; font-size: 0.75em; font-weight: 700; padding: 2px 6px; border-radius: 3px; text-transform: uppercase; font-family: monospace; }
        .badge-shadow { background: #e8f0fe; color: var(--primary-color); border: 1px solid #bfdbfe; }
        .badge-live { background: #dcfce7; color: #15803d; border: 1px solid #bbf7d0; }

        .control-panel {
            background: #ffffff;
            border: 1px solid var(--border-color);
            border-radius: 4px;
            padding: 12px 16px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 10px;
        }

        .btn-tomcat {
            background: #ffffff;
            border: 1px solid var(--border-color);
            color: var(--text-main);
            padding: 6px 12px;
            font-size: 0.85em;
            font-weight: 600;
            border-radius: 3px;
            cursor: pointer;
            text-decoration: none;
            display: inline-flex;
            align-items: center;
            gap: 5px;
            transition: all 0.1s ease;
        }
        .btn-tomcat:hover { background: #f1f5f9; border-color: var(--primary-color); color: var(--primary-color); }
        .btn-tomcat.primary { background: var(--primary-color); color: #fff; border-color: var(--primary-color); }
        .btn-tomcat.danger { background: #fee2e2; border-color: #fca5a5; color: #991b1b; }
        .btn-tomcat.active { background: var(--primary-color); color: #fff; border-color: var(--primary-color); }

        .tomcat-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; }
        .tomcat-card {
            background: #ffffff;
            border: 1px solid var(--border-color);
            border-radius: 4px;
            padding: 12px 16px;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
        }
        .card-label { font-size: 0.8em; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; }
        .card-value { font-size: 1.6em; font-weight: 800; color: var(--primary-color); font-family: var(--font-mono); margin: 4px 0; }
        .card-sub { font-size: 0.8em; color: #64748b; }

        .tomcat-section {
            background: #ffffff;
            border: 1px solid var(--border-color);
            border-radius: 4px;
            padding: 16px;
            display: flex;
            flex-direction: column;
            gap: 12px;
        }

        .section-header {
            font-size: 1em;
            font-weight: 800;
            color: var(--primary-color);
            border-bottom: 1px solid #e2e8f0;
            padding-bottom: 8px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 8px;
        }

        /* Leaflet Clean OSM Map Styling */
        #threat-map {
            width: 100%;
            height: 380px;
            border-radius: 4px;
            border: 1px solid var(--border-color);
            background: #e5e9ec;
            z-index: 1;
        }

        .pulse-marker {
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            background: #004499;
            color: #ffffff;
            font-weight: 800;
            font-size: 11px;
            font-family: var(--font-mono);
            box-shadow: 0 0 0 0 rgba(0, 68, 153, 0.7);
            animation: pulse-ring 1.8s infinite;
        }

        .pulse-marker.high-risk {
            background: #dc2626;
            box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.7);
            animation: pulse-ring-red 1.8s infinite;
        }

        @keyframes pulse-ring {
            0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(0, 68, 153, 0.7); }
            70% { transform: scale(1.1); box-shadow: 0 0 0 12px rgba(0, 68, 153, 0); }
            100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(0, 68, 153, 0); }
        }

        @keyframes pulse-ring-red {
            0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.7); }
            70% { transform: scale(1.1); box-shadow: 0 0 0 14px rgba(220, 38, 38, 0); }
            100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(220, 38, 38, 0); }
        }

        .region-btn-group {
            display: flex;
            gap: 4px;
            flex-wrap: wrap;
        }

        table.tomcat-table { width: 100%; border-collapse: collapse; font-size: 0.88em; text-align: left; border: 1px solid var(--border-color); }
        table.tomcat-table th { background: #f1f5f9; color: var(--primary-color); font-weight: 700; padding: 8px 10px; border: 1px solid var(--border-color); font-size: 0.85em; }
        table.tomcat-table td { padding: 8px 10px; border: 1px solid var(--border-color); color: var(--text-main); }
        table.tomcat-table tr:nth-child(even) td { background: #f8fafc; }
        table.tomcat-table tr:hover td { background: #e8f0fe; cursor: pointer; }

        .pill-action { font-size: 0.75em; font-weight: 700; padding: 2px 6px; border-radius: 3px; font-family: var(--font-mono); display: inline-block; }
        .pill-allow { background: #dcfce7; color: #15803d; border: 1px solid #bbf7d0; }
        .pill-observe { background: #fef3c7; color: #b45309; border: 1px solid #fde68a; }
        .pill-deny { background: #fee2e2; color: #b91c1c; border: 1px solid #fca5a5; }

        .score-box { font-weight: 800; font-family: var(--font-mono); padding: 2px 6px; border-radius: 3px; display: inline-block; }
        .score-low { background: #dcfce7; color: #15803d; }
        .score-med { background: #fef3c7; color: #b45309; }
        .score-high { background: #fee2e2; color: #b91c1c; }

        ${options.customCss || ''}
    </style>
</head>
<body>
    <header>
        <div class="header-brand">
            <img src="https://uno-km.vercel.app/shared/brand/favicon.svg" alt="Logo">
            <h1>AMEVA-Sentinel</h1>
        </div>
        <div class="header-controls">
            <span class="tomcat-badge badge-shadow">v2.2.0 SDK Dashboard</span>
            <a href="https://github.com/uno-km/AMEVA-Sentinel" target="_blank" class="header-btn primary">🐙 GitHub</a>
        </div>
    </header>

    <div class="tomcat-container">
        <div class="status-header-box">
            <div>
                <div class="status-title">
                    <span>🛡️ Security Observability Manager</span>
                    <span class="tomcat-badge badge-shadow">SHADOW MODE</span>
                    <span class="tomcat-badge badge-live">LIVE EMBEDDED SDK</span>
                </div>
                <div style="font-size: 0.85em; color: var(--text-muted); margin-top: 4px;">
                    Endpoint: <code>${apiEndpoint}</code> &bull; 
                    Storage: <span id="banner-events-count"><strong>0 Events</strong></span> &bull; 
                    Tile Engine: <strong>OpenStreetMap (OSM Clean)</strong> &bull;
                    Status: <span class="tomcat-badge badge-live">Active</span>
                </div>
            </div>
            <div>
                <button class="btn-tomcat" id="btn-refresh">🔄 Refresh Status</button>
            </div>
        </div>

        <div class="control-panel">
            <div style="font-weight: 700; color: var(--primary-color);">
                ⚡ Global Ingestion Simulators:
                <span style="font-size:0.85em; font-weight:normal; color:#64748b;">Simulate live traffic from Gabon (GA), East Asia, South America, and Middle East.</span>
            </div>
            <div style="display:flex; gap:8px; flex-wrap:wrap;">
                <button class="btn-tomcat primary" id="btn-sim-gabon">🇬🇦 Sim Gabon (GA / Libreville)</button>
                <button class="btn-tomcat" id="btn-sim-kr">🇰🇷 Sim South Korea (KR / Seoul)</button>
                <button class="btn-tomcat" id="btn-sim-us">🇺🇸 Sim United States (US / New York)</button>
                <button class="btn-tomcat" id="btn-sim-br">🇧🇷 Sim Brazil (BR / São Paulo)</button>
                <button class="btn-tomcat" id="btn-sim-ae">🇦🇪 Sim UAE (AE / Dubai)</button>
                <button class="btn-tomcat" style="color:#b91c1c; border-color:#fca5a5;" id="btn-sim-bot">🤖 Sim Automated Bot</button>
                <button class="btn-tomcat danger" id="btn-clear">🗑️ Clear Store</button>
            </div>
        </div>

        <div class="tomcat-grid">
            <div class="tomcat-card">
                <div class="card-label">Observed Sessions</div>
                <div class="card-value" id="stat-total">0</div>
                <div class="card-sub">Real-time evaluated events</div>
            </div>
            <div class="tomcat-card">
                <div class="card-label">High Risk Sessions</div>
                <div class="card-value" id="stat-high" style="color:#b91c1c;">0</div>
                <div class="card-sub" id="stat-high-pct">0% of observed traffic</div>
            </div>
            <div class="tomcat-card">
                <div class="card-label">Average Risk Score</div>
                <div class="card-value" id="stat-avg-score">0 / 100</div>
                <div class="card-sub">Threshold: &gt;=70 (High)</div>
            </div>
            <div class="tomcat-card">
                <div class="card-label">Enforcement Mode</div>
                <div class="card-value" style="font-size:1.3em; color:#b45309; margin-top:6px;">SHADOW</div>
                <div class="card-sub">Non-blocking evaluation</div>
            </div>
        </div>

        <!-- Global Traffic & Threat Cluster Origin Map -->
        <div class="tomcat-section">
            <div class="section-header">
                <span>🌍 Global Traffic & Threat Cluster Origin Map</span>
                <div class="region-btn-group">
                    <button class="btn-tomcat active" data-region="global">Global</button>
                    <button class="btn-tomcat" data-region="africa">Africa</button>
                    <button class="btn-tomcat" data-region="south_america">South America</button>
                    <button class="btn-tomcat" data-region="oceania">Oceania</button>
                    <button class="btn-tomcat" data-region="central_asia">Central Asia</button>
                    <button class="btn-tomcat" data-region="middle_east">Middle East</button>
                    <button class="btn-tomcat" data-region="europe">Europe</button>
                    <button class="btn-tomcat" data-region="north_america">North America</button>
                    <button class="btn-tomcat" data-region="east_asia">East Asia</button>
                </div>
            </div>

            <div id="threat-map"></div>
        </div>

        <div class="tomcat-section">
            <div class="section-header">
                <span>📋 Recent Evaluated Sessions Stream</span>
                <span style="font-size:0.8em; font-weight:normal; color:#64748b;" id="table-count-label">0 total entries</span>
            </div>

            <div style="overflow-x:auto;">
                <table class="tomcat-table">
                    <thead>
                        <tr>
                            <th style="width:140px;">Trace ID</th>
                            <th style="width:120px;">Location</th>
                            <th style="width:80px;">Score</th>
                            <th style="width:90px;">Evidence Conf</th>
                            <th style="width:110px;">Action (Shadow)</th>
                            <th style="width:140px;">Recommended</th>
                            <th>Triggered Evidence</th>
                            <th style="width:90px;">Time</th>
                        </tr>
                    </thead>
                    <tbody id="sessions-tbody">
                        <tr>
                            <td colspan="8" style="text-align:center; color:#64748b; padding:20px;">
                                No recent events. Click buttons above to simulate global traffic!
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    </div>

    <script>
        const localEvents = [];
        const REGION_CENTERS = {
            global: { center: [20.0, 0.0], zoom: 2 },
            africa: { center: [2.0, 20.0], zoom: 3 },
            south_america: { center: [-15.0, -60.0], zoom: 3 },
            oceania: { center: [-25.0, 135.0], zoom: 3 },
            central_asia: { center: [45.0, 65.0], zoom: 4 },
            middle_east: { center: [26.0, 45.0], zoom: 4 },
            europe: { center: [50.0, 10.0], zoom: 4 },
            north_america: { center: [40.0, -100.0], zoom: 3 },
            east_asia: { center: [35.0, 128.0], zoom: 4 }
        };

        // Initialize Leaflet Map with OpenStreetMap standard tiles (Zero watermark)
        const map = L.map('threat-map', {
            center: [20, 0],
            zoom: 2,
            minZoom: 2,
            maxZoom: 18,
            attributionControl: true
        });

        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);

        const markersLayer = L.layerGroup().addTo(map);

        function updateMapMarkers() {
            markersLayer.clearLayers();
            const locationClusters = {};

            localEvents.forEach(e => {
                const key = (e.country || 'UN') + '_' + (e.city || 'Global');
                if (!locationClusters[key]) {
                    locationClusters[key] = {
                        country: e.country,
                        countryName: e.countryName,
                        city: e.city,
                        lat: e.lat,
                        lng: e.lng,
                        count: 0,
                        highRiskCount: 0,
                        avgScoreSum: 0
                    };
                }
                locationClusters[key].count++;
                locationClusters[key].avgScoreSum += e.score;
                if (e.score >= 70) locationClusters[key].highRiskCount++;
            });

            Object.values(locationClusters).forEach(cl => {
                if (cl.lat && cl.lng) {
                    const avgScore = Math.round(cl.avgScoreSum / cl.count);
                    const isHigh = cl.highRiskCount > 0 || avgScore >= 70;
                    const size = Math.min(48, Math.max(26, 22 + cl.count * 3));

                    const icon = L.divIcon({
                        className: 'custom-pin-icon',
                        html: \`<div class="pulse-marker \${isHigh ? 'high-risk' : ''}" style="width:\${size}px; height:\${size}px;">\${cl.country || 'GA'}</div>\`,
                        iconSize: [size, size],
                        iconAnchor: [size / 2, size / 2]
                    });

                    const marker = L.marker([cl.lat, cl.lng], { icon: icon });
                    marker.bindPopup(\`
                        <div style="font-family:sans-serif; font-size:12px; line-height:1.4;">
                            <strong style="color:#004499; font-size:14px;">[\${cl.country}] \${cl.countryName || cl.country}</strong><br/>
                            <span>City / Region: <strong>\${cl.city || 'Capital'}</strong></span><br/>
                            <span>Observed Sessions: <strong>\${cl.count}</strong></span><br/>
                            <span>Average Risk Score: <strong>\${avgScore} / 100</strong></span><br/>
                            <span>Threat Status: <strong style="color:\${isHigh ? '#dc2626' : '#15803d'}">\${isHigh ? 'HIGH RISK' : 'CLEAN / NORMAL'}</strong></span>
                        </div>
                    \`);
                    markersLayer.addLayer(marker);
                }
            });
        }

        // Region Viewport Switcher
        document.querySelectorAll('.region-btn-group button').forEach(btn => {
            btn.onclick = () => {
                document.querySelectorAll('.region-btn-group button').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const reg = btn.getAttribute('data-region');
                const cfg = REGION_CENTERS[reg] || REGION_CENTERS.global;
                map.flyTo(cfg.center, cfg.zoom, { duration: 1.2 });
            };
        });

        function renderDashboard() {
            const total = localEvents.length;
            const high = localEvents.filter(e => e.score >= 70).length;
            const avgScore = total === 0 ? 0 : Math.round(localEvents.reduce((s, e) => s + e.score, 0) / total);

            document.getElementById('stat-total').textContent = String(total);
            document.getElementById('stat-high').textContent = String(high);
            document.getElementById('stat-high-pct').textContent = total === 0 ? '0%' : Math.round((high/total)*100) + '% of traffic';
            document.getElementById('stat-avg-score').textContent = avgScore + ' / 100';
            document.getElementById('banner-events-count').textContent = total + ' Events';
            document.getElementById('table-count-label').textContent = total + ' total entries';

            const tbody = document.getElementById('sessions-tbody');
            if (total === 0) {
                tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; color:#64748b; padding:20px;">No events recorded yet. Click buttons above to simulate traffic!</td></tr>';
            } else {
                tbody.innerHTML = localEvents.map(e => \`
                    <tr>
                        <td><code>\${e.traceId}</code></td>
                        <td><strong>\${e.country}</strong> <span style="color:#64748b;">(\${e.city})</span></td>
                        <td><span class="score-box \${e.score >= 70 ? 'score-high' : e.score >= 30 ? 'score-med' : 'score-low'}">\${e.score}</span></td>
                        <td><code>\${e.confidence || '0.85'}</code></td>
                        <td><span class="pill-action pill-observe">\${e.action || 'OBSERVE'}</span></td>
                        <td><span class="pill-action \${e.recommended === 'ALLOW' ? 'pill-allow' : 'pill-deny'}">\${e.recommended || 'ALLOW'}</span></td>
                        <td><code>\${e.evidence || 'Clean'}</code></td>
                        <td style="color:#64748b;">\${e.time || 'just now'}</td>
                    </tr>
                \`).join('');
            }

            updateMapMarkers();
        }

        // Global Simulators including Gabon (GA), Korea (KR), USA (US), Brazil (BR), UAE (AE)
        document.getElementById('btn-sim-gabon').onclick = () => {
            localEvents.unshift({
                traceId: 'tr_ga_' + Math.random().toString(36).substring(2, 7),
                country: 'GA',
                countryName: 'Gabon',
                city: 'Libreville',
                lat: 0.4162,
                lng: 9.4673,
                score: 12,
                confidence: '0.96',
                action: 'OBSERVE',
                recommended: 'ALLOW',
                evidence: 'trusted_input (+0)',
                time: new Date().toLocaleTimeString()
            });
            renderDashboard();
        };

        document.getElementById('btn-sim-kr').onclick = () => {
            localEvents.unshift({
                traceId: 'tr_kr_' + Math.random().toString(36).substring(2, 7),
                country: 'KR',
                countryName: 'South Korea',
                city: 'Seoul',
                lat: 37.5665,
                lng: 126.9780,
                score: 8,
                confidence: '0.98',
                action: 'OBSERVE',
                recommended: 'ALLOW',
                evidence: 'trusted_input (+0)',
                time: new Date().toLocaleTimeString()
            });
            renderDashboard();
        };

        document.getElementById('btn-sim-us').onclick = () => {
            localEvents.unshift({
                traceId: 'tr_us_' + Math.random().toString(36).substring(2, 7),
                country: 'US',
                countryName: 'United States',
                city: 'New York',
                lat: 40.7128,
                lng: -74.0060,
                score: 15,
                confidence: '0.94',
                action: 'OBSERVE',
                recommended: 'ALLOW',
                evidence: 'trusted_input (+0)',
                time: new Date().toLocaleTimeString()
            });
            renderDashboard();
        };

        document.getElementById('btn-sim-br').onclick = () => {
            localEvents.unshift({
                traceId: 'tr_br_' + Math.random().toString(36).substring(2, 7),
                country: 'BR',
                countryName: 'Brazil',
                city: 'São Paulo',
                lat: -23.5505,
                lng: -46.6333,
                score: 22,
                confidence: '0.91',
                action: 'OBSERVE',
                recommended: 'ALLOW',
                evidence: 'trusted_input (+0)',
                time: new Date().toLocaleTimeString()
            });
            renderDashboard();
        };

        document.getElementById('btn-sim-ae').onclick = () => {
            localEvents.unshift({
                traceId: 'tr_ae_' + Math.random().toString(36).substring(2, 7),
                country: 'AE',
                countryName: 'United Arab Emirates',
                city: 'Dubai',
                lat: 25.2048,
                lng: 55.2708,
                score: 18,
                confidence: '0.95',
                action: 'OBSERVE',
                recommended: 'ALLOW',
                evidence: 'trusted_input (+0)',
                time: new Date().toLocaleTimeString()
            });
            renderDashboard();
        };

        document.getElementById('btn-sim-bot').onclick = () => {
            localEvents.unshift({
                traceId: 'tr_bot_' + Math.random().toString(36).substring(2, 7),
                country: 'RU',
                countryName: 'Russian Federation',
                city: 'Moscow',
                lat: 55.7558,
                lng: 37.6173,
                score: 88,
                confidence: '0.92',
                action: 'OBSERVE',
                recommended: 'RATE_LIMIT',
                evidence: 'automation.webdriver (+40), rate.burst_request (+35)',
                time: new Date().toLocaleTimeString()
            });
            renderDashboard();
        };

        document.getElementById('btn-clear').onclick = () => {
            localEvents.length = 0;
            renderDashboard();
        };

        document.getElementById('btn-refresh').onclick = renderDashboard;

        // Seed with realistic global baseline including Gabon
        document.getElementById('btn-sim-gabon').click();
        document.getElementById('btn-sim-kr').click();
        document.getElementById('btn-sim-us').click();
    </script>
</body>
</html>`;
}

/**
 * Express Middleware Handler serving the Sentinel Dashboard.
 */
export function createExpressDashboardHandler(options: SentinelDashboardOptions = {}) {
  const html = getSentinelDashboardHtml(options);
  return function sentinelDashboardMiddleware(req: any, res: any, next: any) {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      return next();
    }
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(html);
  };
}

/**
 * Fastify Route Handler serving the Sentinel Dashboard.
 */
export function createFastifyDashboardHandler(options: SentinelDashboardOptions = {}) {
  const html = getSentinelDashboardHtml(options);
  return async function sentinelFastifyDashboardHandler(req: any, reply: any) {
    reply.header('Content-Type', 'text/html; charset=utf-8');
    return reply.code(200).send(html);
  };
}

/**
 * Next.js Route Handler serving the Sentinel Dashboard.
 */
export function createNextDashboardHandler(options: SentinelDashboardOptions = {}) {
  const html = getSentinelDashboardHtml(options);
  return async function sentinelNextDashboardHandler(_req?: any) {
    return new Response(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8'
      }
    });
  };
}
