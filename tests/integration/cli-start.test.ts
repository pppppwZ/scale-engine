import { afterEach, describe, expect, it } from 'vitest'
import { execa } from 'execa'
import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { EventBus } from '../../src/core/eventBus.js'
import { SQLiteArtifactStore } from '../../src/artifact/sqliteStore.js'
import type { TaskPayload } from '../../src/artifact/types.js'

interface StartCliResult {
  phase: 'START'
  specId: string
  planId: string
  taskId: string
  next: string
}

const TEST_FILE = fileURLToPath(import.meta.url)
const TEST_DIR = dirname(TEST_FILE)
const ROOT_DIR = resolve(TEST_DIR, '../..')
const CLI_PATH = resolve(ROOT_DIR, 'src/api/cli.ts')

describe('scale start CLI integration', () => {
  let scaleDir: string | undefined
  let store: SQLiteArtifactStore | undefined

  afterEach(() => {
    store?.close()
    store = undefined
    if (scaleDir && existsSync(scaleDir)) {
      rmSync(scaleDir, { recursive: true, force: true })
    }
    scaleDir = undefined
  })

  it('executes the real CLI entrypoint and persists START artifacts', async () => {
    scaleDir = mkdtempSync(join(tmpdir(), 'scale-start-cli-'))

    const { stdout } = await execa(
      process.execPath,
      [
        '--import',
        'tsx',
        CLI_PATH,
        'start',
        'Add scale start',
        '--description',
        'Route generic coding work through DEFINE, PLAN, and BUILD without applying code changes',
        '--success-criteria',
        'Creates spec,Creates plan,Creates task',
        '--approach',
        'Use phase orchestration only',
        '--rollback',
        'Delete generated artifacts if abandoned',
        '--json',
      ],
      {
        cwd: ROOT_DIR,
        env: {
          ...process.env,
          SCALE_DIR: scaleDir,
        },
      },
    )

    const jsonOutput = stdout.slice(0, stdout.indexOf('\n[') >= 0 ? stdout.indexOf('\n[') : stdout.length)
    const result = JSON.parse(jsonOutput.trim()) as StartCliResult

    expect(result).toMatchObject({
      phase: 'START',
      specId: expect.any(String),
      planId: expect.any(String),
      taskId: expect.any(String),
    })
    expect(result.next).toContain(`scale verify ${result.taskId}`)

    expect(existsSync(join(scaleDir, 'specs', `${result.specId}.md`))).toBe(true)
    expect(existsSync(join(scaleDir, 'plans', `${result.planId}.md`))).toBe(true)

    const eventBus = new EventBus({ eventsDir: join(scaleDir, 'events') })
    store = new SQLiteArtifactStore(eventBus, {
      dbPath: join(scaleDir, 'scale.db'),
      artifactsDir: join(scaleDir, 'artifacts'),
    })

    const spec = await store.get(result.specId)
    const plan = await store.get(result.planId)
    const task = await store.get(result.taskId)

    expect(spec?.type).toBe('Spec')
    expect(spec?.status).toBe('FROZEN')

    expect(plan?.type).toBe('Plan')
    expect(plan?.status).toBe('IMPLEMENTING')
    expect(plan?.parents).toEqual([result.specId])

    expect(task?.type).toBe('Task')
    expect(task?.status).toBe('RUNNING')
    expect(task?.parents).toEqual([result.planId])

    const taskPayload = task?.payload as TaskPayload
    expect(taskPayload.buildStatus).toBe('pending')
    expect(taskPayload.lintStatus).toBe('pending')
    expect(taskPayload.testPassed).toBeUndefined()
  })
})
