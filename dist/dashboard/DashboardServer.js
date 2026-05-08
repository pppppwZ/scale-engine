/**
 * Dashboard Server — Web-based visualization for SCALE Engine state
 * Part of P2-2: Web Dashboard for real-time monitoring
 */
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serveStatic } from 'hono/bun';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const __dirname = dirname(fileURLToPath(import.meta.url));
/**
 * DashboardServer — Hono-based web server for dashboard
 */
export class DashboardServer {
    constructor(bus, options = {}) {
        this.store = null;
        this.evaluator = null;
        this.detectorTracker = null;
        this.app = new Hono();
        this.bus = bus;
        this.store = options.store ?? null;
        this.evaluator = options.evaluator ?? null;
        this.detectorTracker = options.detectorTracker ?? null;
        this.port = options.port ?? 3000;
        this.setupRoutes();
    }
    setupRoutes() {
        // CORS for cross-origin requests
        this.app.use('*', cors());
        // Static files for frontend
        this.app.use('/static/*', serveStatic({ root: './src/dashboard/static' }));
        // Health check
        this.app.get('/health', (c) => c.json({ status: 'ok', timestamp: Date.now() }));
        // Main dashboard state
        this.app.get('/api/state', async (c) => {
            const state = await this.getDashboardState();
            return c.json(state);
        });
        // Artifact tree
        this.app.get('/api/artifacts', async (c) => {
            const tree = await this.getArtifactTree();
            return c.json(tree);
        });
        // Evolution metrics
        this.app.get('/api/evolution', async (c) => {
            const metrics = await this.getEvolutionMetrics();
            return c.json(metrics);
        });
        // Detector stats
        this.app.get('/api/detectors', async (c) => {
            const stats = this.getDetectorStats();
            return c.json(stats);
        });
        // Recent events
        this.app.get('/api/events', async (c) => {
            const limit = parseInt(c.req.query('limit') ?? '50');
            const events = await this.getRecentEvents(limit);
            return c.json(events);
        });
        // AutoDefect statistics
        this.app.get('/api/auto-defects', async (c) => {
            const stats = await this.getAutoDefectStats();
            return c.json(stats);
        });
        // Index page - serve static HTML
        this.app.get('/', (c) => c.html(this.getIndexHtml()));
    }
    async getDashboardState() {
        const [artifacts, evolutionMetrics, detectorStats, autoDefectStats, recentEvents] = await Promise.all([
            this.getArtifactTree(),
            this.getEvolutionMetrics(),
            Promise.resolve(this.getDetectorStats()),
            this.getAutoDefectStats(),
            this.getRecentEvents(20),
        ]);
        return {
            artifacts,
            evolutionMetrics,
            detectorStats,
            autoDefectStats,
            recentEvents,
            timestamp: Date.now(),
        };
    }
    async getArtifactTree() {
        if (!this.store)
            return [];
        const artifacts = await this.store.query({});
        const nodes = [];
        // Build parent-child relationships
        const byId = new Map();
        for (const a of artifacts) {
            const node = {
                id: a.id,
                type: a.type,
                title: a.title,
                status: a.status,
                version: a.version,
                children: [],
                gates: a.gates?.map((g) => ({ name: g.name, required: g.required, passed: g.passed })),
            };
            byId.set(a.id, node);
        }
        // Connect children to parents
        for (const a of artifacts) {
            if (a.parents && a.parents.length > 0) {
                for (const parentId of a.parents) {
                    const parent = byId.get(parentId);
                    if (parent) {
                        const child = byId.get(a.id);
                        if (child)
                            parent.children.push(child);
                    }
                }
            }
        }
        // Root nodes have no parents
        for (const a of artifacts) {
            if (!a.parents || a.parents.length === 0) {
                const node = byId.get(a.id);
                if (node)
                    nodes.push(node);
            }
        }
        return nodes;
    }
    async getEvolutionMetrics() {
        if (!this.evaluator)
            return null;
        return await this.evaluator.evaluate();
    }
    getDetectorStats() {
        if (!this.detectorTracker)
            return [];
        const allStats = this.detectorTracker.getAllStats();
        return allStats.map(s => ({
            name: s.detectorName,
            totalTriggers: s.totalTriggers,
            bySeverity: s.bySeverity,
            lastTrigger: s.recentTriggers.length > 0 ? s.recentTriggers[s.recentTriggers.length - 1]?.triggeredAt : undefined,
        }));
    }
    async getAutoDefectStats() {
        if (!this.store)
            return null;
        // Query all Defect artifacts
        const defects = await this.store.query({ type: 'Defect' });
        const autoCreated = defects.filter(d => {
            const payload = d.payload;
            return payload.autoCreated === true;
        });
        // Count by rootCauseCategory
        const byRootCause = {};
        const bySeverity = {};
        for (const d of autoCreated) {
            const payload = d.payload;
            const rootCause = payload.rootCauseCategory ?? 'unknown';
            const severity = payload.severity ?? 'unknown';
            byRootCause[rootCause] = (byRootCause[rootCause] ?? 0) + 1;
            bySeverity[severity] = (bySeverity[severity] ?? 0) + 1;
        }
        // Recent defects (last 10)
        const recentDefects = autoCreated
            .slice(-10)
            .reverse()
            .map(d => {
            const payload = d.payload;
            return {
                id: d.id,
                title: d.title,
                rootCause: payload.rootCauseCategory ?? 'unknown',
                severity: payload.severity ?? 'unknown',
                detector: payload.detector ?? 'unknown',
                createdAt: d.createdAt ?? (payload.timestamp ?? 0),
            };
        });
        return {
            totalDefects: defects.length,
            autoCreatedCount: autoCreated.length,
            byRootCause,
            bySeverity,
            recentDefects,
        };
    }
    async getRecentEvents(limit) {
        // Get recent events from EventBus via query
        const events = await this.bus.query({ limit });
        return events.map(e => ({
            type: e.type,
            timestamp: e.timestamp,
            artifactId: e.artifactId,
            data: e.payload,
        }));
    }
    start() {
        console.log(`Dashboard server starting on port ${this.port}`);
        // @ts-expect-error Bun runtime API - types not available in npm package
        Bun.serve({
            port: this.port,
            fetch: this.app.fetch,
        });
    }
    stop() {
        // Bun server stops automatically when process exits
        console.log('Dashboard server stopped');
    }
    getIndexHtml() {
        const htmlPath = join(__dirname, 'index.html');
        return readFileSync(htmlPath, 'utf-8');
    }
}
//# sourceMappingURL=DashboardServer.js.map