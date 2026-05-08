// SCALE Engine - Harness Engineering: 程序化质量门禁评估器
// 文章启发："不可机器验证的约束是无效约束"
import { logger } from '../core/logger.js';
export class GateEvaluator {
    static evaluate(conditionStr, payload) {
        try {
            const conditions = this.parseConditions(conditionStr);
            const results = conditions.map(c => this.checkCondition(c, payload));
            const passed = results.every(r => r.passed);
            logger.debug({ conditionStr, passed }, 'Gate evaluated');
            return passed;
        }
        catch (err) {
            logger.error({ conditionStr, err }, 'Gate evaluation failed');
            return false;
        }
    }
    static parseConditions(conditionStr) {
        const conditionPattern = /(\w+)\s*(==|!=|>=|<=|>|<)\s*(\d+|true|false|"[^"]*"|'[^']*')/g;
        const conditions = [];
        let match;
        while ((match = conditionPattern.exec(conditionStr)) !== null) {
            const field = match[1];
            const operator = match[2];
            let value = match[3];
            if (value === 'true')
                value = true;
            else if (value === 'false')
                value = false;
            else if (/^\d+$/.test(value))
                value = parseInt(value, 10);
            else if (/^["']/.test(value))
                value = value.slice(1, -1);
            conditions.push({ field, operator, value });
        }
        return conditions;
    }
    static checkCondition(condition, payload) {
        const { field, operator, value } = condition;
        const actual = payload[field];
        if (actual === undefined)
            return { passed: false, reason: `字段 ${field} 未定义` };
        let passed = false;
        switch (operator) {
            case '==':
                passed = actual === value;
                break;
            case '!=':
                passed = actual !== value;
                break;
            case '>=':
                passed = typeof actual === 'number' && actual >= value;
                break;
            case '<=':
                passed = typeof actual === 'number' && actual <= value;
                break;
            case '>':
                passed = typeof actual === 'number' && actual > value;
                break;
            case '<':
                passed = typeof actual === 'number' && actual < value;
                break;
        }
        return { passed, reason: passed ? undefined : `${field}=${actual} 不满足 ${operator} ${value}` };
    }
    static checkHarnessGates(payload, requiredGates = ['ci-strict', 'coverage-80', 'review-passed', 'lint-clean']) {
        const gateResults = [];
        const payloadRecord = payload;
        for (const gateId of requiredGates) {
            const gate = this.HARNESS_GATES[gateId];
            if (!gate)
                continue;
            if (gate.automatedCheck) {
                const passed = this.evaluate(gate.automatedCheck, payloadRecord);
                gateResults.push({ gate, passed, reason: passed ? undefined : `未满足 ${gate.automatedCheck}` });
            }
            else if (gate.conditions) {
                const results = gate.conditions.map(c => this.checkCondition(c, payloadRecord));
                const passed = results.every(r => r.passed);
                gateResults.push({ gate, passed, reason: passed ? undefined : results.find(r => !r.passed)?.reason });
            }
        }
        const passed = gateResults.filter(r => r.gate.required).every(r => r.passed);
        return { passed, gateResults };
    }
}
GateEvaluator.HARNESS_GATES = {
    'ci-strict': {
        name: 'CI Strict Verification',
        required: true,
        automatedCheck: 'buildExitCode == 0 && testPassed == true && testTotal > 0 && testFailed == 0',
        conditions: [
            { field: 'buildExitCode', operator: '==', value: 0, description: '编译通过' },
            { field: 'testPassed', operator: '==', value: true, description: '测试通过' },
            { field: 'testTotal', operator: '>', value: 0, description: '测试数量>0' },
            { field: 'testFailed', operator: '==', value: 0, description: '无失败测试' },
        ],
        passed: false,
    },
    'coverage-80': {
        name: 'Coverage Gate',
        required: true,
        automatedCheck: 'testCoverage >= 80',
        conditions: [{ field: 'testCoverage', operator: '>=', value: 80, description: '覆盖率≥80%' }],
        passed: false,
    },
    'review-passed': {
        name: 'Code Review Gate',
        required: true,
        automatedCheck: 'reviewPassed == true',
        conditions: [{ field: 'reviewPassed', operator: '==', value: true, description: '评审通过' }],
        passed: false,
    },
    'lint-clean': {
        name: 'Lint Gate',
        required: true,
        automatedCheck: 'lintStatus == "success"',
        conditions: [{ field: 'lintStatus', operator: '==', value: 'success', description: 'Lint通过' }],
        passed: false,
    },
    'e2e-passed': {
        name: 'E2E Verification Gate',
        required: false,
        automatedCheck: 'e2ePassed == true',
        conditions: [{ field: 'e2ePassed', operator: '==', value: true, description: '端到端测试通过' }],
        passed: false,
    },
};
//# sourceMappingURL=GateEvaluator.js.map