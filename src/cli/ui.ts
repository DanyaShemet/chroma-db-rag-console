import boxen from 'boxen'
import pc from 'picocolors'
import { getCollectionName } from '../chroma/index.js'
import type { IndexedChunk as StoredChunk, IndexedChunkRow as ChunkRow, RagAnswerResult } from '../models/types/rag.js'

type BorderColor = NonNullable<Parameters<typeof boxen>[1]>['borderColor']
type RagDiagnostics = RagAnswerResult['diagnostics']

export const promptLabel = pc.bold(pc.cyan('rag-demo'))
export const muted = (value: string): string => pc.dim(value)
export const info = (value: string): string => `${pc.cyan('i')} ${value}`
export const success = (value: string): string => `${pc.green('OK')} ${value}`
export const warning = (value: string): string => `${pc.yellow('!')} ${value}`
export const errorText = (value: string): string => `${pc.red('ERR')} ${value}`

export function printSection(title: string): void {
  console.log(`\n${pc.bold(pc.blue(title))}`)
}

export function printKeyValue(label: string, value: string): void {
  console.log(`${pc.bold(label)} ${value}`)
}

export function printBox(title: string, body: string, borderColor: BorderColor): void {
  console.log(
    boxen(body, {
      title,
      padding: 1,
      margin: { top: 1, bottom: 0, left: 0, right: 0 },
      borderStyle: 'round',
      borderColor,
    }),
  )
}

function printListItem(index: number, title: string, details: string, sourcePath: string, preview: string): void {
  console.log(`  ${pc.cyan(String(index + 1))}. ${pc.bold(title)} ${muted(details)}`)
  console.log(`     ${muted(sourcePath)}`)
  console.log(`     ${preview || muted('[empty chunk]')}`)
}

export function printHelp(): void {
  printSection('Commands')
  console.log(`  ${pc.green('load <path-to-file>')}   ${muted('Index a PDF or TXT file into Chroma')}`)
  console.log(`  ${pc.green('ask <question>')}        ${muted('Ask a question with RAG context from Chroma')}`)
  console.log(
    `  ${pc.green('ask-direct <question>')} ${muted('Ask a question without RAG for hallucination demos')}`,
  )
  console.log(`  ${pc.green('list')}                  ${muted('Show indexed files and chunk count')}`)
  console.log(
    `  ${pc.green('chunks [filter]')}       ${muted('Show stored chunks, optionally filtered by file name or path')}`,
  )
  console.log(`  ${pc.green('chunk <filter> <n>')}    ${muted('Show full content of one stored chunk')}`)
  console.log(`  ${pc.green('reset')}                 ${muted('Delete all indexed records from the demo collection')}`)
  console.log(`  ${pc.green('db-info')}               ${muted('Show basic info about the current Chroma collection')}`)
  console.log(`  ${pc.green('db-drop')}               ${muted('Delete the current Chroma collection completely')}`)
  console.log(`  ${pc.green('help')}                  ${muted('Show this help')}`)
  console.log(`  ${pc.green('exit')}                  ${muted('Quit the console')}\n`)
}

export function printRagDiagnostics(diagnostics: RagDiagnostics): void {
  printSection('RAG Diagnostics')
  printKeyValue('Embedding model:', diagnostics.embeddingModel)
  printKeyValue('Chat model:', diagnostics.chatModel)
  printKeyValue('Top-K:', String(diagnostics.topK))

  if (!diagnostics.matches.length) {
    console.log(muted('Matches: none'))
    return
  }

  console.log(pc.bold('Matches:'))

  diagnostics.matches.forEach((match, index) => {
    const chunkLabel = match.chunkIndex == null ? 'unknown' : match.chunkIndex
    const distanceLabel = match.distance == null ? 'n/a' : match.distance.toFixed(6)
    printListItem(
      index,
      match.fileName,
      `chunk=${chunkLabel}, distance=${distanceLabel}`,
      match.sourcePath,
      match.preview,
    )
  })
}

export function printChunkRows(chunks: ChunkRow[]): void {
  printSection(`Stored Chunks (${chunks.length})`)

  chunks.forEach((chunk, index) => {
    const chunkLabel = chunk.chunkIndex == null ? 'unknown' : chunk.chunkIndex
    printListItem(index, chunk.fileName, `chunk=${chunkLabel}, length=${chunk.length}`, chunk.sourcePath, chunk.preview)
  })
}

export function printStoredChunk(chunk: StoredChunk): void {
  printSection('Chunk')
  printKeyValue('File:', chunk.fileName)
  printKeyValue('Chunk:', String(chunk.chunkIndex))
  printKeyValue('Length:', String(chunk.length))
  printKeyValue('Path:', chunk.sourcePath)
  printBox('Content', chunk.content, 'blue')
}

export function printWelcome(): void {
  printBox(
    'Console RAG Demo',
    `${pc.bold('Status')} ${pc.green('ready')}\n${pc.bold('Chroma collection')} ${getCollectionName()}`,
    'cyan',
  )
  printHelp()
}
