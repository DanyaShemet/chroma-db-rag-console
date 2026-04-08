export type ChromaCollection = {
  id: string
  name: string
}

export type ChromaQueryResponse = {
  documents?: Array<Array<string | null>> | null
  metadatas?: Array<Array<Record<string, unknown> | null>> | null
  distances?: Array<Array<number | null>> | null
}

export type ChromaGetResponse = {
  ids: string[]
  documents?: Array<string | null> | null
  metadatas?: Array<Record<string, unknown> | null> | null
}

export type AddRecordsInput = {
  ids: string[]
  documents: string[]
  embeddings: number[][]
  metadatas: Array<Record<string, unknown>>
}

export type QueryInput = {
  embedding: number[]
  limit: number
}

export type QueryRecordsResult = {
  documents: string[]
  metadatas: Array<Record<string, unknown> | null>
  distances: Array<number | null>
}

export type ChromaCollectionInfo = {
  exists: boolean
  id: string | null
  name: string
  recordCount: number
  baseUrl: string
  tenant: string
  database: string
}
