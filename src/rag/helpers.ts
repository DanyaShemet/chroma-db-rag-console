import type { RankedMatch } from '../models/types/rag.js'

export function getPositiveIntegerEnv(name: string, fallback: number): number {
  const rawValue = process.env[name]

  if (!rawValue) {
    return fallback
  }

  const parsedValue = Number(rawValue)
  return Number.isInteger(parsedValue) && parsedValue > 0 ? parsedValue : fallback
}

export function getNonNegativeNumberEnv(name: string, fallback: number): number {
  const rawValue = process.env[name]

  if (!rawValue) {
    return fallback
  }

  const parsedValue = Number(rawValue)
  return Number.isFinite(parsedValue) && parsedValue >= 0 ? parsedValue : fallback
}

function normalizeText(value: string): string {
  return value.toLowerCase()
}

function getQueryTerms(question: string): string[] {
  return Array.from(
    new Set(
      normalizeText(question)
        .split(/[^\p{L}\p{N}_-]+/u)
        .map((term) => term.trim())
        .filter((term) => term.length >= 3),
    ),
  )
}

export function hasTermOverlap(question: string, match: RankedMatch): boolean {
  const haystack = normalizeText(`${match.fileName} ${match.sourcePath} ${match.document}`)
  return getQueryTerms(question).some((term) => haystack.includes(term))
}
