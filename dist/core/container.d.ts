export type Token<T> = symbol & {
    __type__?: T;
};
export declare function createToken<T>(name: string): Token<T>;
export declare class Container {
    private instances;
    private factories;
    register<T>(token: Token<T>, factory: () => T): void;
    registerInstance<T>(token: Token<T>, instance: T): void;
    resolve<T>(token: Token<T>): T;
    has(token: symbol): boolean;
    reset(): void;
}
export declare const container: Container;
