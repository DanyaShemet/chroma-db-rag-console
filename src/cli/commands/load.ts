import { readFile } from 'node:fs/promises'
import path from 'node:path'
import pc from 'picocolors'
import { indexDocument } from '../../rag/index.js'
import { info, success } from '../ui.js'
import { requireValue } from '../helpers/validation.js'

export async function handleLoadCommand(value: string): Promise<void> {
  if (!requireValue(value, 'Provide a PDF or TXT file path.')) {
    return
  }

  console.log(info('Indexing file...'))
  const absolutePath = path.resolve(value)
  const fileBuffer = await readFile(absolutePath)
  const result = await indexDocument(fileBuffer, path.basename(absolutePath), absolutePath)
  console.log(success(`Indexed ${pc.bold(result.fileName)} with ${result.chunkCount} chunks.`))
}
