import { warning } from '../ui.js'

const chunkCommandExample = 'Provide a file filter and chunk index, for example: chunk aurelion 0'

export function requireValue(value: string, message: string): boolean {
  if (value) {
    return true
  }

  console.log(warning(message))
  return false
}

export function parseChunkCommandValue(value: string): { filter: string; chunkIndex: number } | null {
  if (!value) {
    console.log(warning(chunkCommandExample))
    return null
  }

  const lastSpaceIndex = value.lastIndexOf(' ')

  if (lastSpaceIndex === -1) {
    console.log(warning(chunkCommandExample))
    return null
  }

  const filter = value.slice(0, lastSpaceIndex).trim()
  const chunkIndex = Number(value.slice(lastSpaceIndex + 1).trim())

  if (!filter || !Number.isInteger(chunkIndex) || chunkIndex < 0) {
    console.log(warning('Chunk index must be a non-negative integer.'))
    return null
  }

  return { filter, chunkIndex }
}
