export type ToolMode = 'pretty' | 'minified';

export interface KeyPathEntry {
  /** Dot-style path to the key, e.g. "server.tls.enabled". */
  path: string;
  /** The value summary shown in the round-trip structure preview. */
  value: string;
  /** Nesting depth starting at 0 for top-level keys. */
  depth: number;
}

export interface TomlToolState {
  /** Raw TOML source from the user. */
  toml: string;
  /** 'pretty' prints 2-space indented JSON, 'minified' emits compact JSON. */
  mode: ToolMode;
  /** Saved conversion history, newest first. */
  history: HistoryEntry[];
}

export interface HistoryEntry {
  /** Short human-readable description of the conversion. */
  text: string;
  /** ISO timestamp when the entry was saved. */
  createdAt: string;
}

export interface ParseOutcome {
  ok: boolean;
  /** Parsed JS value when ok. */
  value?: unknown;
  /** Human-readable error when not ok. */
  error?: string;
  /** 1-based line of the TOML error when known. */
  line?: number;
  /** 1-based column of the TOML error when known. */
  column?: number;
}

export const DEFAULT_STATE: TomlToolState = {
  toml: '# Paste TOML here\n[app]\nname = "demo"\nversion = "1.0.0"\n\n[app.features]\ndark_mode = true\ntags = ["fast", "small"]\n',
  mode: 'pretty',
  history: [],
};

export const MAX_HISTORY = 20;

export const TOML_MODES: { value: ToolMode; label: string; hint: string }[] = [
  { value: 'pretty', label: 'Pretty', hint: '2-space indented JSON' },
  { value: 'minified', label: 'Minified', hint: 'compact single-line JSON' },
];

/** Serialize a parsed TOML structure into a flat key-path listing. */
export function keyPaths(value: unknown): KeyPathEntry[] {
  const out: KeyPathEntry[] = [];
  const visit = (node: unknown, prefix: string, depth: number) => {
    if (node === null || typeof node !== 'object' || node instanceof Date) {
      if (prefix) out.push({ path: prefix, value: describeValue(node), depth });
      else out.push({ path: '(root)', value: describeValue(node), depth });
      return;
    }
    if (Array.isArray(node)) {
      const label = prefix || '(root)';
      out.push({ path: label, value: `array(${node.length})`, depth });
      if (node.length === 0) return;
      for (const [i, item] of node.entries()) {
        visit(item, prefix ? `${prefix}.${i}` : String(i), depth + 1);
      }
      return;
    }
    const entries = Object.entries(node as Record<string, unknown>);
    const label = prefix || '(root)';
    out.push({ path: label, value: `table(${entries.length})`, depth });
    if (entries.length === 0) return;
    for (const [k, v] of entries) {
      visit(v, prefix ? `${prefix}.${k}` : k, depth + 1);
    }
  };
  visit(value, '', 0);
  return out;
}

/** Short human description of a leaf value for the structure preview. */
export function describeValue(value: unknown): string {
  if (value === null) return 'null';
  if (value instanceof Date) return value.toISOString();
  switch (typeof value) {
    case 'string':
      return `"${value}"`;
    case 'number':
      return String(value);
    case 'boolean':
      return String(value);
    case 'object': {
      const v = value as Record<string, unknown>;
      if (Array.isArray(value)) return `array(${value.length})`;
      return `table(${Object.keys(v).length})`;
    }
    default:
      return String(value);
  }
}
