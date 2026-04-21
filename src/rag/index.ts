import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { addRecords, deleteRecords, listRecords, queryRecords, resetCollection } from '../chroma/index.js'
import {
  answerQuestion,
  answerQuestionDirect,
  getChatModelName,
  getChatProviderName,
  getEmbedding,
  getEmbeddingModelName,
  getEmbeddingProviderName,
} from '../openai.js'
import { extractDocumentText } from '../pdf.js'
import { splitIntoChunks } from '../chunk.js'
import type {
  DirectAnswerResult,
  IndexedChunk,
  IndexedChunkRow,
  IndexedDocument,
  KnowledgeBaseSummary,
  RagAnswerResult,
  RankedMatch,
} from '../models/types/rag.js'
import { getNonNegativeNumberEnv, getPositiveIntegerEnv, hasTermOverlap } from './helpers.js'

export async function indexPdf(filePath: string): Promise<IndexedDocument> {
  const absolutePath = path.resolve(filePath)
  const fileBuffer = await readFile(absolutePath)
  const text = await extractDocumentText(fileBuffer, absolutePath)
  const extension = path.extname(absolutePath).toLowerCase()
  const documentLabel = extension === '.txt' ? 'TXT file' : 'PDF'

  if (!text.trim()) {
    throw new Error(`${documentLabel} does not contain extractable text.`)
  }

  const chunks = splitIntoChunks(text)

  if (!chunks.length) {
    throw new Error(`No text chunks were created from the ${documentLabel}.`)
  }

  const fileName = path.basename(absolutePath)
  const existingRecords = await listRecords(1000)
  const staleIds = existingRecords.ids.filter((_, index) => {
    const sourcePath = existingRecords.metadatas?.[index]?.sourcePath
    return sourcePath === absolutePath
  })

  if (staleIds.length) {
    await deleteRecords(staleIds)
  }

  const embeddings = await Promise.all(chunks.map((chunk) => getEmbedding(chunk)))

  await addRecords({
    ids: chunks.map(() => randomUUID()),
    documents: chunks,
    embeddings,
    metadatas: chunks.map((_, index) => ({
      fileName,
      sourcePath: absolutePath,
      chunkIndex: index,
    })),
  })

  return {
    fileName,
    chunkCount: chunks.length,
  }
}

export async function askRag(question: string): Promise<RagAnswerResult> {
  const topK = getPositiveIntegerEnv('RAG_TOP_K', 3)
  const candidateLimit = Math.max(topK, getPositiveIntegerEnv('RAG_CANDIDATE_LIMIT', 8))
  const maxDistance = getNonNegativeNumberEnv('RAG_MAX_DISTANCE', 1.2)

  const embedding = await getEmbedding(question)
  const matches = await queryRecords({ embedding, limit: candidateLimit })


  const rankedMatches: RankedMatch[] = matches.documents.map((document, index) => {
    const metadata = matches.metadatas[index]
    const fileNameValue = metadata?.fileName
    const sourcePathValue = metadata?.sourcePath
    const chunkIndexValue = metadata?.chunkIndex

    return {
      fileName: typeof fileNameValue === 'string' ? fileNameValue : 'unknown',
      sourcePath: typeof sourcePathValue === 'string' ? sourcePathValue : 'unknown',
      chunkIndex: typeof chunkIndexValue === 'number' ? chunkIndexValue : null,
      distance: matches.distances[index] ?? null,
      preview: document.slice(0, 120).replace(/\s+/g, ' ').trim(),
      document,
    }
  })


  const distanceFilteredMatches = rankedMatches.filter((match) => match.distance == null || match.distance <= maxDistance)
  const overlapMatches = rankedMatches.filter((match) => hasTermOverlap(question, match))
  const fallbackMatches = overlapMatches.length ? overlapMatches : rankedMatches
  const selectedMatches = (distanceFilteredMatches.length ? distanceFilteredMatches : fallbackMatches).slice(0, topK)
  const diagnosticsMatches = selectedMatches.map(({ document: _document, ...match }) => match)

  if (!selectedMatches.length) {
    return {
      answer: 'I could not find any sufficiently relevant chunks in the knowledge base for this question.',
      contextDocuments: [],
      diagnostics: {
        embeddingProvider: getEmbeddingProviderName(),
        embeddingModel: getEmbeddingModelName(),
        chatProvider: getChatProviderName(),
        chatModel: getChatModelName(),
        topK,
        matches: [],
      },
    }
  }

  const answer = await answerQuestion(
    question,
    selectedMatches.map((match) => match.document),
  )

  return {
    answer,
    contextDocuments: selectedMatches.map((match) => match.document),
    diagnostics: {
      embeddingProvider: getEmbeddingProviderName(),
      embeddingModel: getEmbeddingModelName(),
      chatProvider: getChatProviderName(),
      chatModel: getChatModelName(),
      topK,
      matches: diagnosticsMatches,
    },
  }
}

export async function askDirect(question: string): Promise<DirectAnswerResult> {
  const answer = await answerQuestionDirect(question)
  return {
    answer,
    diagnostics: {
      chatProvider: getChatProviderName(),
      chatModel: getChatModelName(),
    },
  }
}

export async function getKnowledgeBaseSummary(): Promise<KnowledgeBaseSummary> {
  const records = await listRecords()
  const files = Array.from(
    new Set(
      (records.metadatas ?? [])
        .map((metadata) => metadata?.fileName)
        .filter((fileName): fileName is string => typeof fileName === 'string'),
    ),
  )

  return {
    chunkCount: records.ids.length,
    files,
  }
}

export async function getIndexedChunks(filter?: string): Promise<IndexedChunkRow[]> {
  const records = await listRecords(1000)
  const normalizedFilter = filter?.trim().toLowerCase()

  return records.ids
    .map((_, index) => {
      const metadata = records.metadatas?.[index]
      const document = records.documents?.[index]
      const fileNameValue = metadata?.fileName
      const sourcePathValue = metadata?.sourcePath
      const chunkIndexValue = metadata?.chunkIndex

      return {
        fileName: typeof fileNameValue === 'string' ? fileNameValue : 'unknown',
        sourcePath: typeof sourcePathValue === 'string' ? sourcePathValue : 'unknown',
        chunkIndex: typeof chunkIndexValue === 'number' ? chunkIndexValue : null,
        length: typeof document === 'string' ? document.length : 0,
        preview: typeof document === 'string' ? document.replace(/\s+/g, ' ').trim().slice(0, 120) : '',
      }
    })
    .filter((chunk) => {
      if (!normalizedFilter) {
        return true
      }

      return (
        chunk.fileName.toLowerCase().includes(normalizedFilter) ||
        chunk.sourcePath.toLowerCase().includes(normalizedFilter)
      )
    })
    .sort((left, right) => {
      const fileComparison = left.fileName.localeCompare(right.fileName)

      if (fileComparison !== 0) {
        return fileComparison
      }

      return (left.chunkIndex ?? Number.MAX_SAFE_INTEGER) - (right.chunkIndex ?? Number.MAX_SAFE_INTEGER)
    })
}

export async function getIndexedChunk(filter: string, chunkIndex: number): Promise<IndexedChunk | null> {
  const normalizedFilter = filter.trim().toLowerCase()

  if (!normalizedFilter) {
    return null
  }

  const records = await listRecords(1000)

  for (let index = 0; index < records.ids.length; index += 1) {
    const metadata = records.metadatas?.[index]
    const document = records.documents?.[index]
    const fileNameValue = metadata?.fileName
    const sourcePathValue = metadata?.sourcePath
    const chunkIndexValue = metadata?.chunkIndex
    const fileName = typeof fileNameValue === 'string' ? fileNameValue : 'unknown'
    const sourcePath = typeof sourcePathValue === 'string' ? sourcePathValue : 'unknown'

    if (
      typeof document === 'string' &&
      typeof chunkIndexValue === 'number' &&
      chunkIndexValue === chunkIndex &&
      (fileName.toLowerCase().includes(normalizedFilter) ||
        sourcePath.toLowerCase().includes(normalizedFilter))
    ) {
      return {
        fileName,
        sourcePath,
        chunkIndex: chunkIndexValue,
        length: document.length,
        content: document,
      }
    }
  }

  return null
}

export async function clearKnowledgeBase(): Promise<number> {
  return resetCollection()
}
