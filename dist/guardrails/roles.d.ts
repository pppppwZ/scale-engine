import type { RoleDefinition } from '../artifact/types.js';
export declare const ROLES: Record<string, RoleDefinition>;
export declare function getRole(name: string): RoleDefinition | undefined;
export declare function listRoles(): string[];
