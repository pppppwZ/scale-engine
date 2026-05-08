export declare const phaseDefine: import("citty").CommandDef<{
    title: {
        type: "positional";
        required: true;
    };
    description: {
        type: "string";
        alias: string;
    };
    'success-criteria': {
        type: "string";
        alias: string;
        description: string;
    };
    json: {
        type: "boolean";
        default: false;
    };
}>;
export declare const phasePlan: import("citty").CommandDef<{
    'spec-id': {
        type: "positional";
        required: true;
    };
    approach: {
        type: "string";
        alias: string;
        description: string;
    };
    rollback: {
        type: "string";
        alias: string;
        description: string;
    };
    json: {
        type: "boolean";
        default: false;
    };
}>;
export declare const phaseBuild: import("citty").CommandDef<{
    'plan-id': {
        type: "positional";
        required: true;
    };
    description: {
        type: "string";
        alias: string;
        description: string;
    };
    json: {
        type: "boolean";
        default: false;
    };
}>;
export declare const phaseVerify: import("citty").CommandDef<{
    'task-id': {
        type: "positional";
        required: true;
    };
    'build-cmd': {
        type: "string";
        default: string;
        description: string;
    };
    'lint-cmd': {
        type: "string";
        default: string;
        description: string;
    };
    'test-cmd': {
        type: "string";
        default: string;
        description: string;
    };
    'skip-build': {
        type: "boolean";
        default: false;
    };
    'skip-lint': {
        type: "boolean";
        default: false;
    };
    'skip-test': {
        type: "boolean";
        default: false;
    };
    json: {
        type: "boolean";
        default: false;
    };
}>;
export declare const phaseReview: import("citty").CommandDef<{
    'task-id': {
        type: "positional";
        required: false;
    };
    'check-security': {
        type: "boolean";
        default: true;
    };
    'check-style': {
        type: "boolean";
        default: true;
    };
    json: {
        type: "boolean";
        default: false;
    };
}>;
export declare const phaseShip: import("citty").CommandDef<{
    'task-id': {
        type: "positional";
        required: true;
    };
    message: {
        type: "string";
        alias: string;
        description: string;
    };
    'no-commit': {
        type: "boolean";
        default: false;
        description: string;
    };
    json: {
        type: "boolean";
        default: false;
    };
}>;
