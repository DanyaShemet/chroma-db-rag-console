import pc from 'picocolors'
import { indexPdf } from '../../rag/index.js'
import { info, success } from '../ui.js'
import { requireValue } from '../helpers/validation.js'

export async function handleLoadCommand(value: string): Promise<void> {
  if (!requireValue(value, 'Provide a PDF or TXT file path.')) {
    return
  }

  console.log(info('Indexing file...'))
  const result = await indexPdf(value)
  console.log(success(`Indexed ${pc.bold(result.fileName)} with ${result.chunkCount} chunks.`))
}
