import { describe, it, expect } from 'vitest'
import { BASIC_DEV } from '../../src/workflows/presets.js'

describe('workflow presets', () => {
  it('keeps basic-dev spec flow aligned with the Spec FSM', () => {
    const createSpec = BASIC_DEV.steps.find(step => step.stepId === 'create-spec')
    const refineSpec = BASIC_DEV.steps.find(step => step.stepId === 'refine-spec')
    const approveSpec = BASIC_DEV.steps.find(step => step.stepId === 'approve-spec')

    expect(createSpec?.action).toBe('scale create Spec')
    expect(refineSpec?.action).toBe('scale transition SPEC-xxx refine')
    expect(approveSpec?.action).toBe('scale transition SPEC-xxx approve')
    expect(approveSpec?.verificationGate).toBe('spec.status == FROZEN')
  })

  it('keeps basic-dev plan approval aligned with the Plan FSM', () => {
    const approvePlan = BASIC_DEV.steps.find(step => step.stepId === 'approve-plan')

    expect(approvePlan).toBeDefined()
    expect(approvePlan?.action).toBe('scale transition PLAN-xxx review')
    expect(approvePlan?.verificationGate).toBe('plan.status == APPROVED')
  })
})
