export interface MCPTool {
    name: string;
    description: string;
    inputSchema: Record<string, unknown>;
}
export interface MCPRequest {
    jsonrpc: '2.0';
    id: number | string;
    method: string;
    params?: Record<string, unknown>;
}
export interface MCPResponse {
    jsonrpc: '2.0';
    id: number | string;
    result?: unknown;
    error?: {
        code: number;
        message: string;
        data?: unknown;
    };
}
export declare class ScaleMCPServer {
    private bus;
    private store;
    private fsm;
    private kb;
    private ctx;
    constructor(scaleDir?: string);
    getTools(): MCPTool[];
    handleToolCall(name: string, args: Record<string, unknown>): Promise<unknown>;
    handleRequest(request: MCPRequest): Promise<MCPResponse>;
}
