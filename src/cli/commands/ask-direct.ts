import { askDirect } from '../../rag/index.js'
import { info, printBox, printDirectDiagnostics } from '../ui.js'
import { requireValue } from '../helpers/validation.js'

export async function handleAskDirectCommand(value: string): Promise<void> {
  if (!requireValue(value, 'Provide a question.')) {
    return
  }

  console.log(info('Generating answer without RAG context...'))
  const result = await askDirect(value)
  printDirectDiagnostics(result.diagnostics)
  printBox('Direct Answer', result.answer, 'yellow')
}
