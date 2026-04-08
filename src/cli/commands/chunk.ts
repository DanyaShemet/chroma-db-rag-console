import { getIndexedChunk } from '../../rag/index.js'
import { parseChunkCommandValue } from '../helpers/validation.js'
import { printStoredChunk, warning } from '../ui.js'

export async function handleChunkCommand(value: string): Promise<void> {
  const parsedValue = parseChunkCommandValue(value)

  if (!parsedValue) {
    return
  }

  const chunk = await getIndexedChunk(parsedValue.filter, parsedValue.chunkIndex)

  if (!chunk) {
    console.log(warning('Chunk not found.'))
    return
  }

  printStoredChunk(chunk)
}
