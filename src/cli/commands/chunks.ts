import { getIndexedChunks } from '../../rag/index.js'
import { printChunkRows, warning } from '../ui.js'

export async function handleChunksCommand(value: string): Promise<void> {
  const chunks = await getIndexedChunks(value || undefined)

  if (!chunks.length) {
    console.log(warning('No chunks found.'))
    return
  }

  printChunkRows(chunks)
}
