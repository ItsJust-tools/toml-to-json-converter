import TOMLParser from '@iarna/toml';
import { type TomlToolState } from './types';

/** Parsed TOML with line/column info extracted from parser errors. */
export function parseToml(source: string): {
  ok: boolean;
  value?: unknown;
  error?: string;
  line?: number;
  column?: number;
} {
  if (!source.trim()) {
    return { ok: true, value: {} };
  }
  try {
    return { ok: true, value: TOMLParser.parse(source) };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const rowMatch = message.match(/(?:at row|line) (\d+)/i);
    const colMatch = message.match(/col(?:umn)? (\d+)/i);
    const line = rowMatch ? Number(rowMatch[1]) : undefined;
    const column = colMatch ? Number(colMatch[1]) : undefined;
    return {
      ok: false,
      error: message,
      line: line !== undefined && Number.isFinite(line) ? line : undefined,
      column: column !== undefined && Number.isFinite(column) ? column : undefined,
    };
  }
}

export function isTomlState(value: unknown): value is TomlToolState {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Partial<TomlToolState>;
  return typeof v.toml === 'string' && (v.mode === 'pretty' || v.mode === 'minified');
}

export function isState(value: unknown): value is TomlToolState {
  return isTomlState(value);
}
