import { askRag } from '../../rag/index.js'
import { info, printBox, printRagDiagnostics } from '../ui.js'
import { requireValue } from '../helpers/validation.js'

export async function handleAskCommand(value: string): Promise<void> {
  if (!requireValue(value, 'Provide a question.')) {
    return
  }

  console.log(info('Searching Chroma and generating answer...'))
  const result = await askRag(value)
  printRagDiagnostics(result.diagnostics)
  printBox('Answer', result.answer, 'green')
}
