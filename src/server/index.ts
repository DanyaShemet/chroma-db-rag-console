import 'dotenv/config'
import { fileURLToPath } from 'node:url'
import express, { type ErrorRequestHandler } from 'express'
import { deleteCollection, getCollectionInfo } from '../chroma/index.js'
import { getChatModelName, getChatProviderName, getEmbeddingModelName, getEmbeddingProviderName } from '../openai.js'
import {
  askDirect,
  askRag,
  clearKnowledgeBase,
  getIndexedChunk,
  getIndexedChunks,
  getKnowledgeBaseSummary,
  indexDocument,
} from '../rag/index.js'

const port = Number(process.env.PORT) || 3001
const webDistPath = fileURLToPath(new URL('../../web/dist', import.meta.url))
const app = express()

app.use(express.json())

app.get('/api/info', async (_req, res) => {
  res.json({
    collection: await getCollectionInfo(),
    embeddingProvider: getEmbeddingProviderName(),
    embeddingModel: getEmbeddingModelName(),
    chatProvider: getChatProviderName(),
    chatModel: getChatModelName(),
  })
})

app.get('/api/documents', async (_req, res) => {
  res.json(await getKnowledgeBaseSummary())
})

app.post('/api/documents', express.raw({ type: 'application/octet-stream', limit: '50mb' }), async (req, res) => {
  const fileName = typeof req.query.fileName === 'string' ? req.query.fileName.trim() : ''

  if (!fileName || !Buffer.isBuffer(req.body) || !req.body.length) {
    res.status(400).json({ error: 'Provide a PDF or TXT file.' })
    return
  }

  res.json(await indexDocument(new Uint8Array(req.body), fileName, `upload:${fileName}`))
})

app.delete('/api/documents', async (_req, res) => {
  res.json({ deleted: await clearKnowledgeBase() })
})

app.delete('/api/collection', async (_req, res) => {
  res.json({ deleted: await deleteCollection() })
})

app.get('/api/chunks', async (req, res) => {
  const filter = typeof req.query.filter === 'string' ? req.query.filter : undefined
  res.json(await getIndexedChunks(filter))
})

app.get('/api/chunk', async (req, res) => {
  const filter = typeof req.query.filter === 'string' ? req.query.filter : ''
  const chunkIndex = Number(req.query.index)

  if (!filter || !Number.isInteger(chunkIndex) || chunkIndex < 0) {
    res.status(400).json({ error: 'Provide a file filter and a non-negative chunk index.' })
    return
  }

  const chunk = await getIndexedChunk(filter, chunkIndex)

  if (!chunk) {
    res.status(404).json({ error: 'Chunk not found.' })
    return
  }

  res.json(chunk)
})

app.post('/api/ask', async (req, res) => {
  const question = typeof req.body?.question === 'string' ? req.body.question.trim() : ''

  if (!question) {
    res.status(400).json({ error: 'Provide a question.' })
    return
  }

  res.json(await askRag(question))
})

app.post('/api/ask-direct', async (req, res) => {
  const question = typeof req.body?.question === 'string' ? req.body.question.trim() : ''

  if (!question) {
    res.status(400).json({ error: 'Provide a question.' })
    return
  }

  res.json(await askDirect(question))
})

app.use(express.static(webDistPath))

const handleError: ErrorRequestHandler = (error, _req, res, _next) => {
  res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' })
}

app.use(handleError)

app.listen(port, () => {
  console.log(`RAG web server listening on http://localhost:${port}`)
})
