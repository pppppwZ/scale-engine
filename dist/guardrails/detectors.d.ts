import type { IDetector, DetectorContext } from './Gateway.js';
import type { ToolUseInput, ToolResultInput, StopInput, DetectorResult } from '../artifact/types.js';
export declare class BruteRetryDetector implements IDetector {
    name: string;
    private windowMs;
    private threshold;
    check(input: ToolUseInput, ctx: DetectorContext): Promise<DetectorResult>;
}
export declare class IdleToolDetector implements IDetector {
    name: string;
    check(input: ToolUseInput, ctx: DetectorContext): Promise<DetectorResult>;
}
export declare class BusyLoopDetector implements IDetector {
    name: string;
    check(input: ToolUseInput, ctx: DetectorContext): Promise<DetectorResult>;
}
export declare class PrematureDoneDetector implements IDetector {
    name: string;
    check(input: StopInput, ctx: DetectorContext): Promise<DetectorResult>;
}
export declare class BlameShiftDetector implements IDetector {
    name: string;
    private patterns;
    check(input: ToolResultInput, ctx: DetectorContext): Promise<DetectorResult>;
}
