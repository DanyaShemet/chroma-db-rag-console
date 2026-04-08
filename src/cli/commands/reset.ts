import { clearKnowledgeBase } from '../../rag/index.js'
import { success } from '../ui.js'

export async function handleResetCommand(): Promise<void> {
  const deleted = await clearKnowledgeBase()
  console.log(success(`Deleted ${deleted} records.`))
}
