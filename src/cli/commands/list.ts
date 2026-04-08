import { getKnowledgeBaseSummary } from '../../rag/index.js'
import { muted, printKeyValue, printSection } from '../ui.js'

export async function handleListCommand(): Promise<void> {
  const summary = await getKnowledgeBaseSummary()

  printSection('Knowledge Base')
  printKeyValue('Chunks:', String(summary.chunkCount))
  printKeyValue('Files:', summary.files.length ? summary.files.join(', ') : muted('none'))
}
