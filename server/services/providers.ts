import { randomUUID } from 'node:crypto'
import type { Sql } from '../database/client'
import type { ProviderProtocol } from '../../shared/providers/types'
import { decryptSecret, encryptSecret } from '../utils/crypto'

export interface ProviderRecord {
  id: string
  name: string
  protocol: ProviderProtocol
  baseUrl: string
  timeoutMs: number
  enabled: boolean
  models: ModelRecord[]
}

export interface ModelRecord {
  id: string
  modelId: string
  displayName: string
  capabilities: { vision?: boolean }
  isDefaultText: boolean
  isDefaultVision: boolean
  enabled: boolean
}

interface ProviderRow {
  id: string
  name: string
  protocol: ProviderProtocol
  base_url: string
  timeout_ms: number
  enabled: boolean
  api_key_ciphertext: string
  api_key_iv: string
  api_key_tag: string
}

interface ModelRow {
  id: string
  provider_id: string
  model_id: string
  display_name: string
  capabilities: Record<string, unknown>
  is_default_text: boolean
  is_default_vision: boolean
  enabled: boolean
}

export interface RuntimeProvider {
  provider: {
    id: string
    name: string
    protocol: ProviderProtocol
    baseUrl: string
    apiKey: string
    timeoutMs: number
  }
  model: {
    id: string
    modelId: string
    displayName: string
  }
}

export async function listProviders(sql: Sql): Promise<ProviderRecord[]> {
  const providers = await sql<ProviderRow[]>`
    SELECT id, name, protocol, base_url, timeout_ms, enabled,
           api_key_ciphertext, api_key_iv, api_key_tag
    FROM providers
    ORDER BY created_at ASC
  `
  const models = await sql<ModelRow[]>`
    SELECT id, provider_id, model_id, display_name, capabilities,
           is_default_text, is_default_vision, enabled
    FROM models
    ORDER BY created_at ASC
  `

  return providers.map(provider => ({
    id: provider.id,
    name: provider.name,
    protocol: provider.protocol,
    baseUrl: provider.base_url,
    timeoutMs: provider.timeout_ms,
    enabled: provider.enabled,
    models: models
      .filter(model => model.provider_id === provider.id)
      .map(toModelRecord),
  }))
}

function toModelRecord(model: ModelRow): ModelRecord {
  return {
    id: model.id,
    modelId: model.model_id,
    displayName: model.display_name,
    capabilities: { vision: Boolean(model.capabilities.vision) },
    isDefaultText: model.is_default_text,
    isDefaultVision: model.is_default_vision,
    enabled: model.enabled,
  }
}

export async function createProvider(
  sql: Sql,
  input: {
    name: string
    protocol: ProviderProtocol
    baseUrl: string
    apiKey: string
    timeoutMs: number
    enabled: boolean
    models: Array<{
      modelId: string
      displayName: string
      supportsVision: boolean
      isDefaultText: boolean
      isDefaultVision: boolean
    }>
  },
): Promise<string> {
  const id = randomUUID()
  const encrypted = encryptSecret(input.apiKey)

  await sql.begin(async tx => {
    await tx`
      INSERT INTO providers (
        id, name, protocol, base_url, api_key_ciphertext, api_key_iv,
        api_key_tag, timeout_ms, enabled
      ) VALUES (
        ${id}, ${input.name}, ${input.protocol}, ${input.baseUrl},
        ${encrypted.ciphertext}, ${encrypted.iv}, ${encrypted.tag},
        ${input.timeoutMs}, ${input.enabled}
      )
    `
    await replaceModels(tx as unknown as Sql, id, input.models)
  })

  return id
}

async function replaceModels(
  tx: Sql,
  providerId: string,
  models: Array<{
    modelId: string
    displayName: string
    supportsVision: boolean
    isDefaultText: boolean
    isDefaultVision: boolean
  }>,
): Promise<void> {
  const hasTextDefault = models.some(model => model.isDefaultText)
  const hasVisionDefault = models.some(model => model.isDefaultVision)
  if (hasTextDefault) await tx`UPDATE models SET is_default_text = false WHERE is_default_text`
  if (hasVisionDefault) await tx`UPDATE models SET is_default_vision = false WHERE is_default_vision`
  await tx`DELETE FROM models WHERE provider_id = ${providerId}`

  for (const model of models) {
    await tx`
      INSERT INTO models (
        id, provider_id, model_id, display_name, capabilities,
        is_default_text, is_default_vision
      ) VALUES (
        ${randomUUID()}, ${providerId}, ${model.modelId}, ${model.displayName},
        ${tx.json({ vision: model.supportsVision })},
        ${model.isDefaultText}, ${model.isDefaultVision}
      )
    `
  }
}

export async function updateProvider(
  sql: Sql,
  id: string,
  input: {
    name: string
    protocol: ProviderProtocol
    baseUrl: string
    apiKey?: string
    timeoutMs: number
    enabled: boolean
    models: Array<{
      modelId: string
      displayName: string
      supportsVision: boolean
      isDefaultText: boolean
      isDefaultVision: boolean
    }>
  },
): Promise<boolean> {
  return sql.begin(async tx => {
    const existing = await tx<{ id: string }[]>`SELECT id FROM providers WHERE id = ${id}`
    if (!existing.length) return false

    if (input.apiKey) {
      const encrypted = encryptSecret(input.apiKey)
      await tx`
        UPDATE providers SET
          name = ${input.name}, protocol = ${input.protocol}, base_url = ${input.baseUrl},
          api_key_ciphertext = ${encrypted.ciphertext}, api_key_iv = ${encrypted.iv},
          api_key_tag = ${encrypted.tag}, timeout_ms = ${input.timeoutMs},
          enabled = ${input.enabled}, updated_at = now()
        WHERE id = ${id}
      `
    }
    else {
      await tx`
        UPDATE providers SET
          name = ${input.name}, protocol = ${input.protocol}, base_url = ${input.baseUrl},
          timeout_ms = ${input.timeoutMs}, enabled = ${input.enabled}, updated_at = now()
        WHERE id = ${id}
      `
    }

    await replaceModels(tx as unknown as Sql, id, input.models)
    return true
  })
}

export async function deleteProvider(sql: Sql, id: string): Promise<boolean> {
  const deleted = await sql`DELETE FROM providers WHERE id = ${id} RETURNING id`
  return deleted.length > 0
}

type RuntimeRow = ProviderRow & {
  model_id: string
  model_row_id: string
  model_display_name: string
}

function toRuntimeProvider(row: RuntimeRow): RuntimeProvider {
  return {
    provider: {
      id: row.id,
      name: row.name,
      protocol: row.protocol,
      baseUrl: row.base_url,
      apiKey: decryptSecret({
        ciphertext: row.api_key_ciphertext,
        iv: row.api_key_iv,
        tag: row.api_key_tag,
      }),
      timeoutMs: row.timeout_ms,
    },
    model: {
      id: row.model_row_id,
      modelId: row.model_id,
      displayName: row.model_display_name,
    },
  }
}

export async function getRuntimeProvider(
  sql: Sql,
  purpose: 'text' | 'vision' = 'text',
): Promise<RuntimeProvider | null> {
  const rows = purpose === 'vision'
    ? await sql<RuntimeRow[]>`
        SELECT p.id, p.name, p.protocol, p.base_url, p.timeout_ms, p.enabled,
               p.api_key_ciphertext, p.api_key_iv, p.api_key_tag,
               m.id AS model_row_id, m.model_id, m.display_name AS model_display_name
        FROM providers p JOIN models m ON m.provider_id = p.id
        WHERE p.enabled = true AND m.enabled = true AND m.is_default_vision = true
        LIMIT 1
      `
    : await sql<RuntimeRow[]>`
        SELECT p.id, p.name, p.protocol, p.base_url, p.timeout_ms, p.enabled,
               p.api_key_ciphertext, p.api_key_iv, p.api_key_tag,
               m.id AS model_row_id, m.model_id, m.display_name AS model_display_name
        FROM providers p JOIN models m ON m.provider_id = p.id
        WHERE p.enabled = true AND m.enabled = true AND m.is_default_text = true
        LIMIT 1
      `
  const row = rows[0]
  return row ? toRuntimeProvider(row) : null
}

export async function getRuntimeProviderById(
  sql: Sql,
  providerId: string,
  modelId?: string,
): Promise<RuntimeProvider | null> {
  const rows = await sql<RuntimeRow[]>`
    SELECT p.id, p.name, p.protocol, p.base_url, p.timeout_ms, p.enabled,
           p.api_key_ciphertext, p.api_key_iv, p.api_key_tag,
           m.id AS model_row_id, m.model_id, m.display_name AS model_display_name
    FROM providers p JOIN models m ON m.provider_id = p.id
    WHERE p.id = ${providerId} AND p.enabled = true AND m.enabled = true
      AND (${modelId ?? null}::text IS NULL OR m.model_id = ${modelId ?? ''})
    ORDER BY m.is_default_text DESC, m.created_at ASC
    LIMIT 1
  `
  const row = rows[0]
  return row ? toRuntimeProvider(row) : null
}
