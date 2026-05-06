/**
 * Dashboard Server — Web-based visualization for SCALE Engine state
 * Part of P2-2: Web Dashboard for real-time monitoring
 */
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/bun'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { EventBus } from '../core/eventBus.js'
import type { Gate } from '../artifact/types.js'
import type { IArtifactStore } from '../artifact/store.js'
import type { IEvolutionEvaluator, EvolutionMetrics } from '../evolution/EvolutionEvaluator.js'
import type { DetectorStatisticsTracker } from '../guardrails/DetectorEnhanced.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Dashboard state interface
export interface DashboardState {
  artifacts: ArtifactTreeNode[]
  evolutionMetrics: EvolutionMetrics | null
  detectorStats: DetectorStatSummary[]
  recentEvents: RecentEvent[]
  timestamp: number
}

// Artifact tree node for visualization
export interface ArtifactTreeNode {
  id: string
  type: string
  title: string
  status: string
  version: number
  children: ArtifactTreeNode[]
  gates?: GateSummary[]
}

export interface GateSummary {
  name: string
  required: boolean
  passed: boolean
}

export interface DetectorStatSummary {
  name: string
  totalTriggers: number
  bySeverity: Record<string, number>
  lastTrigger?: number
}

export interface RecentEvent {
  type: string
  timestamp: number
  artifactId?: string
  data?: Record<string, unknown>
}

/**
 * DashboardServer — Hono-based web server for dashboard
 */
export class DashboardServer {
  private app: Hono
  private bus: EventBus
  private store: IArtifactStore | null = null
  private evaluator: IEvolutionEvaluator | null = null
  private detectorTracker: DetectorStatisticsTracker | null = null
  private port: number

  constructor(
    bus: EventBus,
    options: {
      port?: number
      store?: IArtifactStore
      evaluator?: IEvolutionEvaluator
      detectorTracker?: DetectorStatisticsTracker
    } = {}
  ) {
    this.app = new Hono()
    this.bus = bus
    this.store = options.store ?? null
    this.evaluator = options.evaluator ?? null
    this.detectorTracker = options.detectorTracker ?? null
    this.port = options.port ?? 3000

    this.setupRoutes()
  }

  private setupRoutes(): void {
    // CORS for cross-origin requests
    this.app.use('*', cors())

    // Static files for frontend
    this.app.use('/static/*', serveStatic({ root: './src/dashboard/static' }))

    // Health check
    this.app.get('/health', (c) => c.json({ status: 'ok', timestamp: Date.now() }))

    // Main dashboard state
    this.app.get('/api/state', async (c) => {
      const state = await this.getDashboardState()
      return c.json(state)
    })

    // Artifact tree
    this.app.get('/api/artifacts', async (c) => {
      const tree = await this.getArtifactTree()
      return c.json(tree)
    })

    // Evolution metrics
    this.app.get('/api/evolution', async (c) => {
      const metrics = await this.getEvolutionMetrics()
      return c.json(metrics)
    })

    // Detector stats
    this.app.get('/api/detectors', async (c) => {
      const stats = this.getDetectorStats()
      return c.json(stats)
    })

    // Recent events
    this.app.get('/api/events', async (c) => {
      const limit = parseInt(c.req.query('limit') ?? '50')
      const events = await this.getRecentEvents(limit)
      return c.json(events)
    })

    // Index page - serve static HTML
    this.app.get('/', (c) => c.html(this.getIndexHtml()))
  }

  async getDashboardState(): Promise<DashboardState> {
    const [artifacts, evolutionMetrics, detectorStats, recentEvents] = await Promise.all([
      this.getArtifactTree(),
      this.getEvolutionMetrics(),
      Promise.resolve(this.getDetectorStats()),
      this.getRecentEvents(20),
    ])

    return {
      artifacts,
      evolutionMetrics,
      detectorStats,
      recentEvents,
      timestamp: Date.now(),
    }
  }

  async getArtifactTree(): Promise<ArtifactTreeNode[]> {
    if (!this.store) return []

    const artifacts = await this.store.query({})
    const nodes: ArtifactTreeNode[] = []

    // Build parent-child relationships
    const byId = new Map<string, ArtifactTreeNode>()
    for (const a of artifacts) {
      const node: ArtifactTreeNode = {
        id: a.id,
        type: a.type,
        title: a.title,
        status: a.status,
        version: a.version,
        children: [],
        gates: a.gates?.map((g: Gate) => ({ name: g.name, required: g.required, passed: g.passed })),
      }
      byId.set(a.id, node)
    }

    // Connect children to parents
    for (const a of artifacts) {
      if (a.parents && a.parents.length > 0) {
        for (const parentId of a.parents) {
          const parent = byId.get(parentId)
          if (parent) {
            const child = byId.get(a.id)
            if (child) parent.children.push(child)
          }
        }
      }
    }

    // Root nodes have no parents
    for (const a of artifacts) {
      if (!a.parents || a.parents.length === 0) {
        const node = byId.get(a.id)
        if (node) nodes.push(node)
      }
    }

    return nodes
  }

  async getEvolutionMetrics(): Promise<EvolutionMetrics | null> {
    if (!this.evaluator) return null
    return await this.evaluator.evaluate()
  }

  getDetectorStats(): DetectorStatSummary[] {
    if (!this.detectorTracker) return []

    const allStats = this.detectorTracker.getAllStats()
    return allStats.map(s => ({
      name: s.detectorName,
      totalTriggers: s.totalTriggers,
      bySeverity: s.bySeverity,
      lastTrigger: s.recentTriggers.length > 0 ? s.recentTriggers[s.recentTriggers.length - 1]?.triggeredAt : undefined,
    }))
  }

  async getRecentEvents(limit: number): Promise<RecentEvent[]> {
    // Get recent events from EventBus via query
    const events = await this.bus.query({ limit })
    return events.map(e => ({
      type: e.type,
      timestamp: e.timestamp,
      artifactId: e.artifactId,
      data: e.payload as Record<string, unknown>,
    }))
  }

  start(): void {
    console.log(`Dashboard server starting on port ${this.port}`)
    // @ts-expect-error Bun runtime API - types not available in npm package
    Bun.serve({
      port: this.port,
      fetch: this.app.fetch,
    })
  }

  stop(): void {
    // Bun server stops automatically when process exits
    console.log('Dashboard server stopped')
  }

  private getIndexHtml(): string {
    const htmlPath = join(__dirname, 'index.html')
    return readFileSync(htmlPath, 'utf-8')
  }
}
