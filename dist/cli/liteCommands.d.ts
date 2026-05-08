export declare const liteCommand: import("citty").CommandDef<{
    phase: {
        type: "positional";
        required: false;
    };
    interactive: {
        type: "boolean";
        alias: string;
        default: false;
    };
    list: {
        type: "boolean";
        alias: string;
        default: false;
    };
    skills: {
        type: "boolean";
        alias: string;
        default: false;
    };
}>;
export declare const liteDefine: import("citty").CommandDef<{
    title: {
        type: "positional";
        required: true;
    };
    description: {
        type: "string";
        alias: string;
    };
    json: {
        type: "boolean";
        default: false;
    };
}>;
export declare const litePlan: import("citty").CommandDef<{
    'spec-id': {
        type: "positional";
        required: true;
    };
    json: {
        type: "boolean";
        default: false;
    };
}>;
export declare const liteBuild: import("citty").CommandDef<{
    'plan-id': {
        type: "positional";
        required: true;
    };
    json: {
        type: "boolean";
        default: false;
    };
}>;
export declare const liteVerify: import("citty").CommandDef<{
    'task-id': {
        type: "positional";
        required: true;
    };
    json: {
        type: "boolean";
        default: false;
    };
}>;
export declare const liteReview: import("citty").CommandDef<{
    json: {
        type: "boolean";
        default: false;
    };
}>;
export declare const liteShip: import("citty").CommandDef<{
    'task-id': {
        type: "positional";
        required: true;
    };
    json: {
        type: "boolean";
        default: false;
    };
}>;
