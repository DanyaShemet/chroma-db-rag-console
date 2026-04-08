import 'dotenv/config'
import readline from 'node:readline/promises'
import { stdin as input, stdout as output } from 'node:process'
import { checkChromaConnection } from './chroma/index.js'
import { runCommand } from './cli/commands/dispatch.js'
import { parseInput } from './cli/helpers/parse-input.js'
import { errorText, printWelcome, promptLabel } from './cli/ui.js'

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback
}

async function promptLoop(rl: readline.Interface): Promise<void> {
  while (true) {
    const rawInput = (await rl.question(`${promptLabel}> `)).trim()

    if (!rawInput) {
      continue
    }

    try {
      const result = await runCommand(parseInput(rawInput))

      if (result === 'exit') {
        return
      }
    } catch (error) {
      console.error(errorText(getErrorMessage(error, 'Unknown error')))
    }
  }
}

async function main(): Promise<void> {
  await checkChromaConnection()

  const rl = readline.createInterface({ input, output })

  try {
    printWelcome()
    await promptLoop(rl)
  } finally {
    rl.close()
  }
}

main().catch((error) => {
  console.error(errorText(`Startup failed: ${getErrorMessage(error, 'Unknown startup error')}`))
  process.exitCode = 1
})
