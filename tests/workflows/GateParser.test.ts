import { describe, it, expect } from 'vitest'
import { GateParser } from '../../src/workflows/GateParser.js'

const parser = new GateParser()

describe('GateParser', () => {
  it('parses and evaluates unicode comparison (≤)', async () => {
    const artifact = {
      id: 'SPEC-1',
      type: 'Spec',
      version: 1,
      status: 'DRAFT',
      statusHistory: [],
      parents: [],
      children: [],
      title: 'spec',
      contentRef: '',
      payload: { ambiguityScore: 0.1 },
      gates: [],
      createdBy: { kind: 'system', component: 'test' },
      createdAt: Date.now(),
      updatedAt: Date.now(),
      tags: [],
      labels: {},
    }

    const result = await parser.evaluateString('ambiguityScore ≤ 0.2', { artifact })
    expect(result.passed).toBe(true)
    expect(result.reason).toBe('OK')
  })

  it('supports present/identified semantic checks', async () => {
    const artifact = {
      id: 'DEFECT-1',
      type: 'Defect',
      version: 1,
      status: 'OPEN',
      statusHistory: [],
      parents: [],
      children: [],
      title: 'defect',
      contentRef: '',
      payload: { rootCauseCategory: 'implementation_bug' },
      gates: [],
      createdBy: { kind: 'system', component: 'test' },
      createdAt: Date.now(),
      updatedAt: Date.now(),
      tags: [],
      labels: {},
    }

    const result = await parser.evaluateString('rootCauseCategory identified', { artifact })
    expect(result.passed).toBe(true)
    expect(result.reason).toBe('OK')
  })

  it('returns explicit unsupported reason for unknown expressions', async () => {
    const artifact = {
      id: 'SPEC-2',
      type: 'Spec',
      version: 1,
      status: 'DRAFT',
      statusHistory: [],
      parents: [],
      children: [],
      title: 'spec',
      contentRef: '',
      payload: {},
      gates: [],
      createdBy: { kind: 'system', component: 'test' },
      createdAt: Date.now(),
      updatedAt: Date.now(),
      tags: [],
      labels: {},
    }

    const result = await parser.evaluateString('some brand new syntax', { artifact })
    expect(result.passed).toBe(false)
    expect(result.reason).toBe('Unsupported gate expression')
  })
})
