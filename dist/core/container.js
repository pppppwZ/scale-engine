// SCALE Engine — Dependency Injection
// 极简 DI：避免循环依赖，方便测试时替换实现
export function createToken(name) {
    return Symbol(name);
}
export class Container {
    constructor() {
        this.instances = new Map();
        this.factories = new Map();
    }
    register(token, factory) {
        this.factories.set(token, factory);
    }
    registerInstance(token, instance) {
        this.instances.set(token, instance);
    }
    resolve(token) {
        if (this.instances.has(token))
            return this.instances.get(token);
        const factory = this.factories.get(token);
        if (!factory)
            throw new Error(`No registration for token: ${token.toString()}`);
        const instance = factory();
        this.instances.set(token, instance);
        return instance;
    }
    has(token) {
        return this.instances.has(token) || this.factories.has(token);
    }
    reset() {
        this.instances.clear();
    }
}
export const container = new Container();
//# sourceMappingURL=container.js.map