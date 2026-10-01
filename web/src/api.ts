import type { ChromaCollectionInfo } from '../../src/models/types/chroma'
import type {
  DirectAnswerResult,
  IndexedChunk,
  IndexedChunkRow,
  IndexedDocument,
  KnowledgeBaseSummary,
  RagAnswerResult,
} from '../../src/models/types/rag'

export type AppInfo = {
  collection: ChromaCollectionInfo
  embeddingProvider: string
  embeddingModel: string
  chatProvider: string
  chatModel: string
}

export type ChunkTarget = {
  filter: string
  chunkIndex: number
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, init)
  const body = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(body?.error || `Request failed (${response.status})`)
  }

  return body as T
}

function postJson<T>(path: string, payload: unknown): Promise<T> {
  return request<T>(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export const api = {
  getInfo: () => request<AppInfo>('/api/info'),
  getDocuments: () => request<KnowledgeBaseSummary>('/api/documents'),
  uploadDocument: (file: File) =>
    request<IndexedDocument>(`/api/documents?${new URLSearchParams({ fileName: file.name })}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/octet-stream' },
      body: file,
    }),
  resetDocuments: () => request<{ deleted: number }>('/api/documents', { method: 'DELETE' }),
  dropCollection: () => request<{ deleted: boolean }>('/api/collection', { method: 'DELETE' }),
  getChunks: (filter: string) => request<IndexedChunkRow[]>(`/api/chunks?${new URLSearchParams({ filter })}`),
  getChunk: (filter: string, index: number) =>
    request<IndexedChunk>(`/api/chunk?${new URLSearchParams({ filter, index: String(index) })}`),
  ask: (question: string) => postJson<RagAnswerResult>('/api/ask', { question }),
  askDirect: (question: string) => postJson<DirectAnswerResult>('/api/ask-direct', { question }),
}

export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error'
}
