import { PgBoss } from 'pg-boss'

export const TASK_QUEUE = 'ppt-generation'

export type TaskJobStage = 'outline' | 'proof' | 'generate'

export interface TaskJobData {
  taskId: string
  stage: TaskJobStage
}

let bossPromise: Promise<PgBoss> | undefined

export async function getBoss(): Promise<PgBoss> {
  if (!bossPromise) {
    const config = useRuntimeConfig()
    const boss = new PgBoss({
      connectionString: config.databaseUrl,
      schema: 'pgboss',
    })
    boss.on('error', (error: unknown) => console.error('[queue]', error))
    bossPromise = boss.start().then(async (instance: PgBoss) => {
      await instance.createQueue(TASK_QUEUE)
      return instance
    })
  }
  return bossPromise
}

export async function enqueueTask(data: TaskJobData): Promise<void> {
  const boss = await getBoss()
  await boss.send(TASK_QUEUE, data, {
    retryLimit: 2,
    retryDelay: 5,
    expireInSeconds: 60 * 30,
    singletonKey: `${data.taskId}:${data.stage}`,
    singletonSeconds: 10,
  })
}
