type ChromaCollection = {
  id: string
  name: string
}

type ChromaQueryResponse = {
  documents?: Array<Array<string | null>> | null
  metadatas?: Array<Array<Record<string, unknown> | null>> | null
  distances?: Array<Array<number | null>> | null
}

type ChromaGetResponse = {
  ids: string[]
  documents?: Array<string | null> | null
  metadatas?: Array<Record<string, unknown> | null> | null
}

type AddRecordsInput = {
  ids: string[]
  documents: string[]
  embeddings: number[][]
  metadatas: Array<Record<string, unknown>>
}

type QueryInput = {
  embedding: number[]
  limit: number
}

const chromaBaseUrl = (process.env.CHROMA_URL || 'http://localhost:8000').replace(/\/+$/, '')
const chromaTenant = process.env.CHROMA_TENANT || 'default_tenant'
const chromaDatabase = process.env.CHROMA_DATABASE || 'default_database'
const collectionName = process.env.CHROMA_COLLECTION || 'rag_demo_console'
const chromaToken = process.env.CHROMA_TOKEN

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
  const response = await fetch(`${chromaBaseUrl}${pathname}`, {
    ...init,
    headers: {
      ...getHeaders(),
      ...(init?.headers || {}),
    },
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Chroma request failed (${response.status}): ${body}`)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return (await response.json()) as T
}

async function findCollectionByName(name: string): Promise<ChromaCollection | null> {
  const collections = await request<ChromaCollection[]>(
    `/api/v2/tenants/${chromaTenant}/databases/${chromaDatabase}/collections`,
  )

  return collections.find((collection) => collection.name === name) ?? null
}

export async function ensureCollection(): Promise<ChromaCollection> {
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

export async function queryRecords(input: QueryInput): Promise<{
  documents: string[]
  metadatas: Array<Record<string, unknown> | null>
  distances: Array<number | null>
}> {
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
  const collection = await ensureCollection()
  const current = await listRecords()

  if (!current.ids.length) {
    return 0
  }

  return deleteRecords(current.ids)
}

export async function checkChromaConnection(): Promise<void> {
  await request<string>('/api/v2/version')
}
