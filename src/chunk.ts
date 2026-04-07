export function splitIntoChunks(text: string, chunkSize = 500): string[] {
  const normalizedText = text.replace(/\r\n/g, '\n').trim()

  if (!normalizedText) {
    return []
  }

  const chunks: string[] = []
  let start = 0

  while (start < normalizedText.length) {
    let end = Math.min(start + chunkSize, normalizedText.length)

    if (end < normalizedText.length) {
      const splitWindowStart = Math.max(start, start + Math.floor(chunkSize * 0.7))
      const whitespaceIndex = normalizedText.lastIndexOf(' ', end)
      const newlineIndex = normalizedText.lastIndexOf('\n', end)
      const splitIndex = Math.max(whitespaceIndex, newlineIndex)

      if (splitIndex >= splitWindowStart) {
        end = splitIndex
      }
    }

    const chunk = normalizedText.slice(start, end).trim()

    if (chunk) {
      chunks.push(chunk)
    }

    start = end
  }

  if (chunks.length > 1) {
    const lastChunk = chunks[chunks.length - 1]

    if (lastChunk.length < Math.max(20, Math.floor(chunkSize * 0.1))) {
      chunks[chunks.length - 2] = `${chunks[chunks.length - 2]} ${lastChunk}`.trim()
      chunks.pop()
    }
  }

  return chunks
}
