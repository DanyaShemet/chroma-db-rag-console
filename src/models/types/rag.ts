export type IndexedDocument = {
  fileName: string
  chunkCount: number
}

export type RagMatch = {
  fileName: string
  sourcePath: string
  chunkIndex: number | null
  distance: number | null
  preview: string
}

export type RankedMatch = RagMatch & {
  document: string
}

export type RagAnswerResult = {
  answer: string
  contextDocuments: string[]
  diagnostics: {
    embeddingModel: string
    chatModel: string
    topK: number
    matches: RagMatch[]
  }
}

export type DirectAnswerResult = {
  answer: string
}

export type KnowledgeBaseSummary = {
  chunkCount: number
  files: string[]
}

export type IndexedChunkRow = {
  fileName: string
  sourcePath: string
  chunkIndex: number | null
  length: number
  preview: string
}

export type IndexedChunk = {
  fileName: string
  sourcePath: string
  chunkIndex: number
  length: number
  content: string
}
