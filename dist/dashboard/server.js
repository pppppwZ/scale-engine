// SCALE Engine — Dashboard Server
import { logger } from '../core/logger.js';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
export class DashboardServer {
    constructor(config) {
        this.config = config;
        this.server = null;
        this.viewsDir = join(import.meta.dirname ?? __dirname, 'views');
    }
    start() {
        this.server = createServer(async (req, res) => {
            try {
                await this.handleRequest(req, res);
            }
            catch (error) {
                logger.error({ error }, 'Dashboard error');
                res.statusCode = 500;
                res.end('Error');
            }
        });
        this.server.listen(this.config.port, this.config.host, () => {
            logger.info({ port: this.config.port }, 'Dashboard started');
        });
    }
    stop() { if (this.server) {
        this.server.close();
        this.server = null;
    } }
    async handleRequest(req, res) {
        const url = req.url ?? '/';
        if (url.startsWith('/api/')) {
            await this.handleApi(url, res);
            return;
        }
        const viewMap = {
            '/': 'artifact-flow.html', '/artifacts': 'artifact-flow.html',
            '/sessions': 'session-timeline.html', '/knowledge': 'knowledge-graph.html',
            '/evolution': 'evolution-metrics.html', '/agents': 'agent-stats.html',
        };
        const viewFile = viewMap[url] ?? 'artifact-flow.html';
        try {
            const content = await readFile(join(this.viewsDir, viewFile), 'utf-8');
            res.setHeader('Content-Type', 'text/html');
            res.end(content);
        }
        catch {
            res.statusCode = 404;
            res.end('Not found');
        }
    }
    async handleApi(url, res) {
        res.setHeader('Content-Type', 'application/json');
        const data = await this.collectData();
        if (url === '/api/artifacts')
            res.end(JSON.stringify(data.artifacts));
        else if (url === '/api/sessions')
            res.end(JSON.stringify(data.sessions));
        else if (url === '/api/knowledge')
            res.end(JSON.stringify(data.knowledge));
        else if (url === '/api/evolution')
            res.end(JSON.stringify(data.evolution));
        else if (url === '/api/agents')
            res.end(JSON.stringify(data.agents));
        else if (url === '/api/all')
            res.end(JSON.stringify(data));
        else {
            res.statusCode = 404;
            res.end(JSON.stringify({ error: 'Not found' }));
        }
    }
    async collectData() {
        const artifacts = await this.config.artifactStore.query({});
        const artifactData = artifacts.map(a => ({ id: a.id, type: a.type, status: a.status, title: a.title, createdAt: a.createdAt }));
        const knowledge = await this.config.knowledgeBase.recall({});
        const knowledgeData = knowledge.map(k => ({ id: k.id, type: k.type, title: k.title, relevance: k.relevance }));
        const evolution = this.config.evolutionStats?.() ?? { lessonsExtracted: 0, rulesProposed: 0, rulesApproved: 0, hooksGenerated: 0 };
        const agents = this.config.agentManager.listAll().map(d => ({ id: d.id, name: d.name, dispatchCount: 0, successRate: 1.0 }));
        return { artifacts: artifactData, sessions: [], knowledge: knowledgeData, evolution, agents };
    }
}
//# sourceMappingURL=server.js.map