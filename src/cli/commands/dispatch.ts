import type { CommandResult, ParsedInput } from '../../models/types/cli.js'
import { printHelp, warning } from '../ui.js'
import { handleAskCommand } from './ask.js'
import { handleAskDirectCommand } from './ask-direct.js'
import { handleChunkCommand } from './chunk.js'
import { handleChunksCommand } from './chunks.js'
import { handleDbDropCommand } from './db-drop.js'
import { handleDbInfoCommand } from './db-info.js'
import { handleListCommand } from './list.js'
import { handleLoadCommand } from './load.js'
import { handleResetCommand } from './reset.js'

export async function runCommand(parsedInput: ParsedInput): Promise<CommandResult> {
  switch (parsedInput.command) {
    case 'exit':
      return 'exit'
    case 'help':
      printHelp()
      return 'continue'
    case 'load':
      await handleLoadCommand(parsedInput.value)
      return 'continue'
    case 'ask':
      await handleAskCommand(parsedInput.value)
      return 'continue'
    case 'ask-direct':
      await handleAskDirectCommand(parsedInput.value)
      return 'continue'
    case 'list':
      await handleListCommand()
      return 'continue'
    case 'chunks':
      await handleChunksCommand(parsedInput.value)
      return 'continue'
    case 'chunk':
      await handleChunkCommand(parsedInput.value)
      return 'continue'
    case 'reset':
      await handleResetCommand()
      return 'continue'
    case 'db-info':
      await handleDbInfoCommand()
      return 'continue'
    case 'db-drop':
      await handleDbDropCommand()
      return 'continue'
    default:
      console.log(warning('Unknown command.'))
      printHelp()
      return 'continue'
  }
}
