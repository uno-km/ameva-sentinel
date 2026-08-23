/**
 * @ameva/sentinel-browser
 * Privacy-first browser environment & user interaction telemetry collector
 * 
 * Guarantees:
 * - Throttled pointermove sampling (100ms interval) to protect 60fps main-thread
 * - Discrete click/touch/keyboard interactions recorded un-throttled
 * - ZERO raw mouse coordinates collected
 * - ZERO keystroke contents or form values collected
 * - Non-persistent per-tab ephemeral session identifier
 * - Clean lifecycle management with start() and destroy()
 */

export interface BrowserTelemetryOptions {
  samplingWindowMs?: number;
  maxEventsCap?: number;
  pointerSampleIntervalMs?: number;
  autoStart?: boolean;
}

export interface BrowserTelemetrySnapshot {
  telemetryObserved: boolean;
  sampleComplete: boolean;
  observationDurationMs: number;
  webdriverObserved: boolean;
  trustedInputCount: number;
  pointerEventCount: number;
  touchEventCount: number;
  keyboardEventCount: number;
  touchMismatch: boolean;
  suspiciousUA: boolean;
  usedHeapMb: number;
  totalHeapMb: number;
  heapLimitMb: number;
  totalVisitCount: number;
  pastPathsHistory: string;
  collectedAt: string;
}

export interface HeapMemorySnapshot {
  usedHeapMb: number;
  totalHeapMb: number;
  heapLimitMb: number;
}

export interface SoulHistorySnapshot {
  firstSeenAt: string;
  totalVisitCount: number;
  totalSessionCount: number;
  pastPathsHistory: string;
}

/**
 * Capture browser JavaScript Heap Memory footprint via performance.memory (MB).
 * Safe fallback on browsers / engines without performance.memory API.
 */
export function getHeapMemoryUsage(): HeapMemorySnapshot {
  if (typeof performance !== 'undefined' && (performance as any).memory) {
    const mem = (performance as any).memory;
    return {
      usedHeapMb: Math.round(((mem.usedJSHeapSize || 0) / (1024 * 1024)) * 10) / 10,
      totalHeapMb: Math.round(((mem.totalJSHeapSize || 0) / (1024 * 1024)) * 10) / 10,
      heapLimitMb: Math.round(((mem.jsHeapSizeLimit || 0) / (1024 * 1024)) * 10) / 10
    };
  }
  return {
    usedHeapMb: 0,
    totalHeapMb: 0,
    heapLimitMb: 0
  };
}

/**
 * Persistent Soul & History Tracking across browser sessions.
 */
export function getSoulHistory(currentPath: string = typeof location !== 'undefined' ? location.pathname : '/'): SoulHistorySnapshot {
  if (typeof localStorage === 'undefined' || typeof sessionStorage === 'undefined') {
    return {
      firstSeenAt: new Date().toISOString(),
      totalVisitCount: 1,
      totalSessionCount: 1,
      pastPathsHistory: currentPath
    };
  }
  try {
    const now = new Date().toISOString();
    let firstSeen = localStorage.getItem('__ameva_first_seen');
    if (!firstSeen) {
      firstSeen = now;
      localStorage.setItem('__ameva_first_seen', firstSeen);
    }

    let visitCount = parseInt(localStorage.getItem('__ameva_visit_count') || '0', 10) + 1;
    localStorage.setItem('__ameva_visit_count', visitCount.toString());

    let sessionCount = parseInt(localStorage.getItem('__ameva_session_count') || '0', 10);
    if (!sessionStorage.getItem('__ameva_sid_init')) {
      sessionCount += 1;
      localStorage.setItem('__ameva_session_count', sessionCount.toString());
      sessionStorage.setItem('__ameva_sid_init', '1');
    }

    let pathHistory: string[] = [];
    try {
      pathHistory = JSON.parse(localStorage.getItem('__ameva_path_hist') || '[]');
    } catch (e) {}
    pathHistory.unshift(currentPath);
    pathHistory = pathHistory.slice(0, 10);
    localStorage.setItem('__ameva_path_hist', JSON.stringify(pathHistory));

    return {
      firstSeenAt: firstSeen,
      totalVisitCount: visitCount,
      totalSessionCount: sessionCount,
      pastPathsHistory: pathHistory.join(' -> ')
    };
  } catch (e) {
    return {
      firstSeenAt: new Date().toISOString(),
      totalVisitCount: 1,
      totalSessionCount: 1,
      pastPathsHistory: currentPath
    };
  }
}

/**
 * Ephemeral browser session identifier (pseudo-random, non-cryptographic).
 * Scoped exclusively to browser tab sessionStorage lifetime.
 */
export function getLocalSessionId(): string {
  if (typeof sessionStorage === 'undefined') return 'ephemeral_local_session';
  const key = 'ameva:sentinel:session-id';
  try {
    const existing = sessionStorage.getItem(key);
    if (existing) return existing;
    const newId = 'sess_' + Math.random().toString(36).substring(2, 10) + '_' + Date.now().toString(36);
    sessionStorage.setItem(key, newId);
    return newId;
  } catch (e) {
    return 'ephemeral_local_session';
  }
}

export class BrowserTelemetryCollector {
  private startTime = Date.now();
  private isListening = false;
  private maxEventsCap: number;
  private pointerIntervalMs: number;
  private samplingWindowMs: number;
  private lastPointerSampleAt = 0;
  private abortController: AbortController | null = null;

  // Interaction Counters
  private trustedEvents = 0;
  private pointerEvents = 0;
  private touchEvents = 0;
  private keyboardEvents = 0;

  constructor(options: BrowserTelemetryOptions = {}) {
    this.maxEventsCap = options.maxEventsCap ?? 500;
    this.pointerIntervalMs = options.pointerSampleIntervalMs ?? 100;
    this.samplingWindowMs = options.samplingWindowMs ?? 5000;
    if (options.autoStart !== false) {
      this.start();
    }
  }

  private recordInteraction(type: 'pointer' | 'touch' | 'keyboard', isTrusted: boolean): void {
    if (type === 'pointer' && this.pointerEvents < this.maxEventsCap) this.pointerEvents++;
    if (type === 'touch' && this.touchEvents < this.maxEventsCap) this.touchEvents++;
    if (type === 'keyboard' && this.keyboardEvents < this.maxEventsCap) this.keyboardEvents++;

    if (isTrusted && this.trustedEvents < this.maxEventsCap) {
      this.trustedEvents++;
    }
  }

  start(): void {
    if (this.isListening || typeof window === 'undefined') return;
    this.isListening = true;
    this.abortController = new AbortController();
    const { signal } = this.abortController;

    // 1. Throttled Pointer Movement (100ms interval)
    const onPointerMove = (e: PointerEvent | MouseEvent) => {
      const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
      if (now - this.lastPointerSampleAt < this.pointerIntervalMs) {
        return; // Throttled to prevent main-thread overhead
      }
      this.lastPointerSampleAt = now;
      this.recordInteraction('pointer', e.isTrusted === true);
    };

    // 2. Discrete User Click (Never throttled)
    const onClick = (e: MouseEvent) => {
      this.recordInteraction('pointer', e.isTrusted === true);
    };

    // 3. Discrete Touch Interactions (Never throttled)
    const onTouch = (e: TouchEvent) => {
      this.recordInteraction('touch', e.isTrusted === true);
    };

    // 4. Discrete Keyboard Interactions (Never throttled)
    const onKey = (e: KeyboardEvent) => {
      this.recordInteraction('keyboard', e.isTrusted === true);
    };

    window.addEventListener('pointermove', onPointerMove as EventListener, { passive: true, signal });
    window.addEventListener('click', onClick as EventListener, { passive: true, signal });
    window.addEventListener('touchstart', onTouch as EventListener, { passive: true, signal });
    window.addEventListener('keydown', onKey as EventListener, { passive: true, signal });
  }

  snapshot(): BrowserTelemetrySnapshot {
    const isBrowser = typeof window !== 'undefined' && typeof navigator !== 'undefined';
    if (!isBrowser) {
      return {
        telemetryObserved: false,
        sampleComplete: false,
        observationDurationMs: 0,
        webdriverObserved: false,
        trustedInputCount: 0,
        pointerEventCount: 0,
        touchEventCount: 0,
        keyboardEventCount: 0,
        touchMismatch: false,
        suspiciousUA: false,
        usedHeapMb: 0,
        totalHeapMb: 0,
        heapLimitMb: 0,
        totalVisitCount: 1,
        pastPathsHistory: '/',
        collectedAt: new Date().toISOString()
      };
    }

    const elapsed = Math.max(0, Date.now() - this.startTime);
    const nav = navigator as any;
    const isWebdriver = !!nav.webdriver;
    const hasTouch = 'ontouchstart' in window || (nav.maxTouchPoints || 0) > 0;
    const isMobileUA = /Android|iPhone|iPad|iPod/i.test(nav.userAgent || '');
    const isTouchMismatch = isMobileUA && !hasTouch;
    const isSuspiciousUA = !nav.userAgent || /HeadlessChrome|PhantomJS|Selenium|Playwright|curl|wget|python-requests/i.test(nav.userAgent);
    const heap = getHeapMemoryUsage();
    const soul = getSoulHistory();

    return {
      telemetryObserved: this.isListening,
      sampleComplete: elapsed >= this.samplingWindowMs,
      observationDurationMs: elapsed,
      webdriverObserved: isWebdriver,
      trustedInputCount: this.trustedEvents,
      pointerEventCount: this.pointerEvents,
      touchEventCount: this.touchEvents,
      keyboardEventCount: this.keyboardEvents,
      touchMismatch: isTouchMismatch,
      suspiciousUA: isSuspiciousUA,
      usedHeapMb: heap.usedHeapMb,
      totalHeapMb: heap.totalHeapMb,
      heapLimitMb: heap.heapLimitMb,
      totalVisitCount: soul.totalVisitCount,
      pastPathsHistory: soul.pastPathsHistory,
      collectedAt: new Date().toISOString()
    };
  }

  reset(): void {
    this.startTime = Date.now();
    this.trustedEvents = 0;
    this.pointerEvents = 0;
    this.touchEvents = 0;
    this.keyboardEvents = 0;
    this.lastPointerSampleAt = 0;
  }

  destroy(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    this.isListening = false;
  }
}

export function createBrowserTelemetry(options?: BrowserTelemetryOptions): BrowserTelemetryCollector {
  return new BrowserTelemetryCollector(options);
}

export const browserTelemetry = new BrowserTelemetryCollector();

export interface DashboardMountOptions {
  endpoint?: string;
  data?: any;
  headers?: Record<string, string>;
  refreshIntervalMs?: number;
  title?: string;
}

export interface DashboardInstance {
  destroy: () => void;
  refresh: () => Promise<void>;
}

/**
 * Drop-in Embedded Observability & Forensic Intelligence Dashboard Mounter.
 */
export function mountDashboard(
  container: string | HTMLElement,
  options: DashboardMountOptions = {}
): DashboardInstance {
  if (typeof document === 'undefined') {
    return {
      destroy: () => {},
      refresh: async () => {}
    };
  }

  const el = typeof container === 'string' ? document.querySelector<HTMLElement>(container) : container;
  if (!el) {
    console.warn('[AMEVA-Sentinel] Container element not found for mountDashboard:', container);
    return {
      destroy: () => {},
      refresh: async () => {}
    };
  }

  let timer: any = null;
  const title = options.title || 'AMEVA-Sentinel Observability Console';

  el.innerHTML = `
    <div class="sentinel-embed-dash" style="background:#090d16; color:#f8fafc; font-family:system-ui,-apple-system,sans-serif; padding:20px; border-radius:8px; border:1px solid #1e293b;">
      <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #1e293b; padding-bottom:12px; margin-bottom:16px;">
        <h3 style="margin:0; font-size:1.2rem; color:#38bdf8; font-weight:800;">${title}</h3>
        <button id="__sentinel_refresh_btn" style="background:#0284c7; color:#fff; border:none; padding:6px 12px; border-radius:4px; cursor:pointer; font-size:0.8rem; font-weight:600;">↻ Refresh</button>
      </div>
      <div id="__sentinel_stats_grid" style="display:grid; grid-template-columns:repeat(auto-fit, minmax(180px, 1fr)); gap:12px; margin-bottom:16px;"></div>
      <div id="__sentinel_briefing_box" style="background:#0f172a; border:1px solid #1e293b; border-radius:6px; padding:14px; margin-bottom:16px;">
        <div style="font-size:0.85rem; font-weight:700; color:#38bdf8; margin-bottom:8px;">Heuristic Persona Briefing</div>
        <div id="__sentinel_briefings" style="display:flex; flex-direction:column; gap:8px; font-size:0.85rem;">Loading diagnostics...</div>
      </div>
      <div id="__sentinel_flow_box" style="background:#0f172a; border:1px solid #1e293b; border-radius:6px; padding:14px; margin-bottom:16px;">
        <div style="font-size:0.85rem; font-weight:700; color:#38bdf8; margin-bottom:8px;">Path Traversal Flow</div>
        <div id="__sentinel_flow_diagram" style="display:flex; flex-wrap:wrap; gap:8px; font-size:0.85rem;">Aggregating paths...</div>
      </div>
    </div>
  `;

  async function renderData(payload: any) {
    if (!payload) return;
    const grid = el!.querySelector('#__sentinel_stats_grid');
    const briefings = el!.querySelector('#__sentinel_briefings');
    const flowDiagram = el!.querySelector('#__sentinel_flow_diagram');

    const metrics = payload.metrics || payload.overview || {};
    if (grid) {
      grid.innerHTML = `
        <div style="background:#0f172a; padding:12px; border-radius:6px; border:1px solid #1e293b;">
          <div style="font-size:0.75rem; color:#94a3b8; font-weight:700;">VISITORS</div>
          <div style="font-size:1.5rem; font-weight:800; color:#38bdf8; margin-top:2px;">${metrics.total_visitors ?? metrics.totalVisitors ?? metrics.totalRecords ?? 0}</div>
        </div>
        <div style="background:#0f172a; padding:12px; border-radius:6px; border:1px solid #1e293b;">
          <div style="font-size:0.75rem; color:#94a3b8; font-weight:700;">ACTIVE SESSIONS</div>
          <div style="font-size:1.5rem; font-weight:800; color:#38bdf8; margin-top:2px;">${metrics.total_sessions ?? metrics.totalSessions ?? 0}</div>
        </div>
        <div style="background:#0f172a; padding:12px; border-radius:6px; border:1px solid #1e293b;">
          <div style="font-size:0.75rem; color:#94a3b8; font-weight:700;">BOTS IDENTIFIED</div>
          <div style="font-size:1.5rem; font-weight:800; color:#ef4444; margin-top:2px;">${payload.ai_bots_detected?.length ?? metrics.botCount ?? 0}</div>
        </div>
      `;
    }

    const logs: any[] = payload.deep_forensic_logs || payload.verdicts || [];
    if (briefings) {
      if (logs.length === 0) {
        briefings.innerHTML = '<div style="color:#94a3b8;">No forensic footprints logged yet.</div>';
      } else {
        briefings.innerHTML = logs.slice(0, 5).map((l: any) => {
          const text = l.summaryNarrative || l.narrative || `Visitor ${l.visitor_id || l.visitorId} active from ${l.country || 'GLOBAL'}`;
          const isBot = text.includes('봇') || text.includes('BOT');
          const isDev = text.includes('개발자') || text.includes('ENGINEER');
          const border = isBot ? '#ef4444' : isDev ? '#10b981' : '#38bdf8';
          const bg = isBot ? 'rgba(239,68,68,0.1)' : isDev ? 'rgba(16,185,129,0.1)' : '#0b1329';
          return `<div style="background:${bg}; border-left:3px solid ${border}; padding:8px 12px; border-radius:0 4px 4px 0;">${text}</div>`;
        }).join('');
      }
    }

    if (flowDiagram) {
      const transitions = new Map<string, number>();
      logs.forEach((l: any) => {
        const hist = l.past_paths_history || l.pastPathsHistory || '';
        const segs = hist.split(/\s*(?:->|──>)\s*/).filter(Boolean);
        for (let i = 0; i < segs.length - 1; i++) {
          const k = `${segs[i]} ===> ${segs[i+1]}`;
          transitions.set(k, (transitions.get(k) || 0) + 1);
        }
      });

      if (transitions.size === 0) {
        flowDiagram.innerHTML = '<div style="color:#94a3b8;">No multi-hop traversal recorded.</div>';
      } else {
        let flowHtml = '';
        transitions.forEach((cnt, k) => {
          const [s, t] = k.split(' ===> ');
          flowHtml += `<div style="display:flex; align-items:center; gap:6px; background:#0b1329; padding:6px 10px; border-radius:4px; font-family:monospace; font-size:0.8rem;"><span style="color:#38bdf8;">${s}</span><span style="color:#94a3b8;">──></span><span style="color:#38bdf8;">${t} <span style="background:#0284c7; color:#fff; padding:1px 5px; border-radius:8px; font-size:0.7rem;">${cnt}</span></span></div>`;
        });
        flowDiagram.innerHTML = flowHtml;
      }
    }
  }

  async function fetchAndRender() {
    if (options.data) {
      renderData(options.data);
      return;
    }
    if (options.endpoint) {
      try {
        const res = await fetch(options.endpoint, { headers: options.headers });
        if (res.ok) {
          const json = await res.json();
          renderData(json);
        }
      } catch (e) {
        console.warn('[AMEVA-Sentinel] Failed to fetch dashboard data:', e);
      }
    }
  }

  const refreshBtn = el.querySelector('#__sentinel_refresh_btn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => fetchAndRender());
  }

  fetchAndRender();
  if (options.refreshIntervalMs && options.refreshIntervalMs > 0) {
    timer = setInterval(fetchAndRender, options.refreshIntervalMs);
  }

  return {
    destroy: () => {
      if (timer) clearInterval(timer);
      el.innerHTML = '';
    },
    refresh: fetchAndRender
  };
}
