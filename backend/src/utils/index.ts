// Shared utilities

export function toSnakeCase(str: string): string {
  return str
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, 512);
}

export function extractVariableIndexes(text: string): number[] {
  const matches = text.matchAll(/\{\{(\d+)\}\}/g);
  return [...matches].map((m) => Number(m[1]));
}

export function validateVariableSequence(text: string): boolean {
  const indexes = extractVariableIndexes(text).sort((a, b) => a - b);
  return indexes.every((v, i) => v === i + 1);
}

export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + "...";
}
