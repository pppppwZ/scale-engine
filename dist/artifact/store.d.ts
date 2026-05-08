import type { Artifact, ArtifactType, Gate, ArtifactId } from './types.js';
import type { IEventBus } from '../core/eventBus.js';
export interface CreateArtifactInput {
    type: ArtifactType;
    title: string;
    payload: unknown;
    parents?: ArtifactId[];
    tags?: string[];
    labels?: Record<string, string>;
    createdBy?: import('./types.js').Actor;
    initialStatus?: string;
    contentBody?: string;
}
export interface ArtifactFilter {
    type?: ArtifactType | ArtifactType[];
    status?: string | string[];
    tags?: string[];
    parentId?: ArtifactId;
    limit?: number;
}
export interface IArtifactStore {
    create(input: CreateArtifactInput): Promise<Artifact>;
    get(id: ArtifactId): Promise<Artifact | null>;
    update(id: ArtifactId, updates: Partial<Artifact>): Promise<Artifact>;
    delete(id: ArtifactId): Promise<void>;
    query(filter: ArtifactFilter): Promise<Artifact[]>;
    findChildren(parentId: ArtifactId, type?: ArtifactType): Promise<Artifact[]>;
    findParents(childId: ArtifactId): Promise<Artifact[]>;
    setGate(artifactId: ArtifactId, gate: Gate): Promise<void>;
}
export declare class InMemoryArtifactStore implements IArtifactStore {
    private eventBus;
    private artifacts;
    private artifactsDir;
    private seq;
    constructor(eventBus: IEventBus, opts?: {
        artifactsDir?: string;
    });
    create(input: CreateArtifactInput): Promise<Artifact>;
    get(id: ArtifactId): Promise<Artifact | null>;
    update(id: ArtifactId, updates: Partial<Artifact>): Promise<Artifact>;
    delete(id: ArtifactId): Promise<void>;
    query(filter: ArtifactFilter): Promise<Artifact[]>;
    findChildren(parentId: ArtifactId, type?: ArtifactType): Promise<Artifact[]>;
    findParents(childId: ArtifactId): Promise<Artifact[]>;
    setGate(artifactId: ArtifactId, gate: Gate): Promise<void>;
    private generateId;
    private contentPath;
}
