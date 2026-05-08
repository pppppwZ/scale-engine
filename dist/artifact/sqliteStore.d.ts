/**
 * SCALE Engine — SQLite Artifact Store (W3)
 *
 * 替代 InMemoryArtifactStore，提供持久化存储。
 * 设计参考：docs/02-DATA-MODEL.md §四、docs/03-CORE-MODULES.md §3.2
 *
 * 特性：
 * - SQLite WAL 模式（读写并发安全）
 * - JSON 序列化 payload/gates/statusHistory/parents/children/tags/labels
 * - 事件自动落入 events 表
 * - 完整 CRUD + query + findChildren + findParents
 */
import type { Artifact, ArtifactType, Gate, ArtifactId } from './types.js';
import type { IEventBus } from '../core/eventBus.js';
import type { IArtifactStore, CreateArtifactInput, ArtifactFilter } from './store.js';
export declare class SQLiteArtifactStore implements IArtifactStore {
    private eventBus;
    private db;
    private seq;
    private artifactsDir;
    private stmtInsert;
    private stmtGet;
    private stmtUpdate;
    private stmtDelete;
    private stmtInsertEdge;
    private stmtDeleteEdges;
    private stmtFindChildren;
    private stmtFindParents;
    private stmtInsertEvent;
    constructor(eventBus: IEventBus, opts?: {
        dbPath?: string;
        artifactsDir?: string;
    });
    private prepareStatements;
    create(input: CreateArtifactInput): Promise<Artifact>;
    get(id: ArtifactId): Promise<Artifact | null>;
    update(id: ArtifactId, updates: Partial<Artifact>): Promise<Artifact>;
    delete(id: ArtifactId): Promise<void>;
    query(filter: ArtifactFilter): Promise<Artifact[]>;
    findChildren(parentId: ArtifactId, type?: ArtifactType): Promise<Artifact[]>;
    findParents(childId: ArtifactId): Promise<Artifact[]>;
    setGate(artifactId: ArtifactId, gate: Gate): Promise<void>;
    /** 查询事件（从 events 表） */
    queryEvents(opts?: {
        artifactId?: string;
        type?: string;
        limit?: number;
    }): unknown[];
    /** 获取统计信息 */
    stats(): {
        artifactCount: number;
        eventCount: number;
        byType: Record<string, number>;
    };
    /** 关闭数据库连接 */
    close(): void;
    private generateId;
    private contentPath;
    private toRow;
    private fromRow;
}
