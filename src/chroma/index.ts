import type {
  AddRecordsInput,
  ChromaCollection,
  ChromaCollectionInfo,
  ChromaGetResponse,
  ChromaQueryResponse,
  QueryInput,
  QueryRecordsResult,
} from '../models/types/chroma.js'

const chromaBaseUrl = (process.env.CHROMA_URL || 'http://localhost:8000').replace(/\/+$/, '')
const chromaTenant = process.env.CHROMA_TENANT || 'default_tenant'
const chromaDatabase = process.env.CHROMA_DATABASE || 'default_database'
const chromaToken = process.env.CHROMA_TOKEN

function getEmbeddingModelForCollection(): string {
  return (
    process.env.EMBEDDING_MODEL ||
    'text-embedding-3-small'
  )
}

export function getCollectionName(): string {
  const configuredCollection = process.env.CHROMA_COLLECTION?.trim()

  if (configuredCollection && configuredCollection !== 'rag_demo_console') {
    return configuredCollection
  }

  return `rag_${getEmbeddingModelForCollection()}`
}

function getHeaders(): HeadersInit {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  if (chromaToken) {
    headers['x-chroma-token'] = chromaToken
  }

  return headers
}

async function request<T>(pathname: string, init?: RequestInit): Promise<T> {
  let response: Response

  try {
    response = await fetch(`${chromaBaseUrl}${pathname}`, {
      ...init,
      headers: {
        ...getHeaders(),
        ...(init?.headers || {}),
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown network error'
    throw new Error(
      `Cannot reach Chroma at ${chromaBaseUrl}. Start the server, for example \`chroma run --path ./chroma-data\`, or update CHROMA_URL. Original error: ${message}`,
    )
  }

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Chroma request failed (${response.status}): ${body}`)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return (await response.json()) as T
}

async function rawRequest(pathname: string, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(`${chromaBaseUrl}${pathname}`, {
      ...init,
      headers: {
        ...getHeaders(),
        ...(init?.headers || {}),
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown network error'
    throw new Error(
      `Cannot reach Chroma at ${chromaBaseUrl}. Start the server, for example \`chroma run --path ./chroma-data\`, or update CHROMA_URL. Original error: ${message}`,
    )
  }
}

async function findCollectionByName(name: string): Promise<ChromaCollection | null> {
  const collections = await request<ChromaCollection[]>(
    `/api/v2/tenants/${chromaTenant}/databases/${chromaDatabase}/collections`,
  )

  return collections.find((collection) => collection.name === name) ?? null
}

export async function ensureCollection(): Promise<ChromaCollection> {
  const collectionName = getCollectionName()
  const existingCollection = await findCollectionByName(collectionName)

  if (existingCollection) {
    return existingCollection
  }

  return request<ChromaCollection>(
    `/api/v2/tenants/${chromaTenant}/databases/${chromaDatabase}/collections`,
    {
      method: 'POST',
      body: JSON.stringify({
        name: collectionName,
        metadata: {
          source: 'src-console',
        },
      }),
    },
  )
}

export async function getCollectionInfo(): Promise<ChromaCollectionInfo> {
  const name = getCollectionName()
  const collection = await findCollectionByName(name)

  if (!collection) {
    return {
      exists: false,
      id: null,
      name,
      recordCount: 0,
      baseUrl: chromaBaseUrl,
      tenant: chromaTenant,
      database: chromaDatabase,
    }
  }

  const records = await request<ChromaGetResponse>(
    `/api/v2/tenants/${chromaTenant}/databases/${chromaDatabase}/collections/${collection.id}/get`,
    {
      method: 'POST',
      body: JSON.stringify({
        limit: 1_000_000,
        include: ['metadatas'],
      }),
    },
  )

  return {
    exists: true,
    id: collection.id,
    name: collection.name,
    recordCount: records.ids.length,
    baseUrl: chromaBaseUrl,
    tenant: chromaTenant,
    database: chromaDatabase,
  }
}

export async function deleteCollection(): Promise<boolean> {
  const collection = await findCollectionByName(getCollectionName())

  if (!collection) {
    return false
  }

  const deleteByIdResponse = await rawRequest(
    `/api/v2/tenants/${chromaTenant}/databases/${chromaDatabase}/collections/${collection.id}`,
    {
      method: 'DELETE',
    },
  )

  if (deleteByIdResponse.ok) {
    return true
  }

  if (deleteByIdResponse.status !== 404) {
    const body = await deleteByIdResponse.text()
    throw new Error(`Chroma request failed (${deleteByIdResponse.status}): ${body}`)
  }

  const deleteByNameResponse = await rawRequest(
    `/api/v2/tenants/${chromaTenant}/databases/${chromaDatabase}/collections/${encodeURIComponent(collection.name)}`,
    {
      method: 'DELETE',
    },
  )

  if (!deleteByNameResponse.ok) {
    if (deleteByNameResponse.status === 404) {
      return false
    }

    const body = await deleteByNameResponse.text()
    throw new Error(`Chroma request failed (${deleteByNameResponse.status}): ${body}`)
  }

  return true
}

export async function addRecords(input: AddRecordsInput): Promise<void> {
  const collection = await ensureCollection()

  await request<void>(
    `/api/v2/tenants/${chromaTenant}/databases/${chromaDatabase}/collections/${collection.id}/add`,
    {
      method: 'POST',
      body: JSON.stringify({
        ids: input.ids,
        documents: input.documents,
        embeddings: input.embeddings,
        metadatas: input.metadatas,
      }),
    },
  )
}

export async function deleteRecords(ids: string[]): Promise<number> {
  if (!ids.length) {
    return 0
  }

  const collection = await ensureCollection()
  const response = await request<{ deleted: number }>(
    `/api/v2/tenants/${chromaTenant}/databases/${chromaDatabase}/collections/${collection.id}/delete`,
    {
      method: 'POST',
      body: JSON.stringify({
        ids,
      }),
    },
  )

  return response.deleted
}

export async function queryRecords(input: QueryInput): Promise<QueryRecordsResult> {
  const collection = await ensureCollection()
  const response = await request<ChromaQueryResponse>(
    `/api/v2/tenants/${chromaTenant}/databases/${chromaDatabase}/collections/${collection.id}/query`,
    {
      method: 'POST',
      body: JSON.stringify({
        query_embeddings: [input.embedding],
        n_results: input.limit,
        include: ['documents', 'metadatas', 'distances'],
      }),
    },
  )

  const documents = response.documents?.[0] ?? []
  const metadatas = response.metadatas?.[0] ?? []
  const distances = response.distances?.[0] ?? []
  const rows = documents.flatMap((document, index) => {
    if (typeof document !== 'string') {
      return []
    }

    return [
      {
        document,
        metadata: metadatas[index] ?? null,
        distance: distances[index] ?? null,
      },
    ]
  })

  return {
    documents: rows.map((row) => row.document),
    metadatas: rows.map((row) => row.metadata),
    distances: rows.map((row) => row.distance),
  }
}

export async function listRecords(limit = 100): Promise<ChromaGetResponse> {
  const collection = await ensureCollection()

  return request<ChromaGetResponse>(
    `/api/v2/tenants/${chromaTenant}/databases/${chromaDatabase}/collections/${collection.id}/get`,
    {
      method: 'POST',
      body: JSON.stringify({
        limit,
        include: ['documents', 'metadatas'],
      }),
    },
  )
}

export async function resetCollection(): Promise<number> {
  const current = await listRecords()

  if (!current.ids.length) {
    return 0
  }

  return deleteRecords(current.ids)
}

export async function checkChromaConnection(): Promise<void> {
  await request<string>('/api/v2/version')
}
