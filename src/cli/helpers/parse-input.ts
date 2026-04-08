import type { ParsedInput } from '../../models/types/cli.js'

export function parseInput(rawInput: string): ParsedInput {
  const [command = '', ...rest] = rawInput.trim().split(' ')

  return {
    command,
    value: rest.join(' ').trim(),
  }
}
