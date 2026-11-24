import type { Tool, DeserializeResult } from '@itsjust/core';
import toolConfig from './tool.config';
import { parseToml } from './ui-shared';
import {
  DEFAULT_STATE,
  MAX_HISTORY,
  describeValue,
  keyPaths,
  type HistoryEntry,
  type ToolMode,
  type TomlToolState,
} from './types';

const VALID_MODES: ToolMode[] = ['pretty', 'minified'];

/** Serialize tool state into a compact JSON string for share/import. */
export function serializeState(state: TomlToolState): string {
  return JSON.stringify({
    toml: state.toml,
    mode: state.mode,
    history: state.history,
  });
}

function stringOr(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback;
}

function validHistory(value: unknown): HistoryEntry[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (entry): entry is HistoryEntry =>
        typeof entry === 'object' &&
        entry !== null &&
        typeof (entry as HistoryEntry).text === 'string' &&
        typeof (entry as HistoryEntry).createdAt === 'string'
    )
    .slice(0, MAX_HISTORY);
}

/** Validate and recover tool state from an arbitrary payload. */
export function deserializeState(data: unknown): DeserializeResult<TomlToolState> {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    return {
      success: false,
      error: 'Invalid data format: expected TOML to JSON converter state object',
    };
  }
  const v = data as Record<string, unknown>;
  const mode: ToolMode = VALID_MODES.includes(v.mode as ToolMode)
    ? (v.mode as ToolMode)
    : DEFAULT_STATE.mode;
  const state: TomlToolState = {
    toml: stringOr(v.toml, DEFAULT_STATE.toml),
    mode,
    history: validHistory(v.history),
  };
  return { success: true, data: state };
}

/** Append a history entry to state, capped at MAX_HISTORY, newest first. */
export function withHistory(state: TomlToolState, text: string, now = new Date()): TomlToolState {
  const entry: HistoryEntry = { text, createdAt: now.toISOString() };
  return { ...state, history: [entry, ...state.history].slice(0, MAX_HISTORY) };
}

/** True when a serialized string round-trips back to the same state. */
export function roundTrips(state: TomlToolState): boolean {
  try {
    const restored = deserializeState(JSON.parse(serializeState(state)));
    return restored.success && JSON.stringify(restored.data) === JSON.stringify(state);
  } catch {
    return false;
  }
}

/** Parse the state's TOML and return the pretty/minified JSON output. */
export function jsonFor(state: TomlToolState): string {
  const outcome = parseToml(state.toml);
  if (!outcome.ok || outcome.value === undefined) return '';
  return JSON.stringify(outcome.value, null, state.mode === 'pretty' ? 2 : undefined);
}

/** Parse the state's TOML and return the flat key structure preview. */
export function structureFor(state: TomlToolState) {
  if (!state.toml.trim()) return [];
  const outcome = parseToml(state.toml);
  if (!outcome.ok || outcome.value === undefined) return [];
  const paths = keyPaths(outcome.value);
  return paths.map((entry) => ({
    path: entry.path || '(root)',
    value: entry.value,
    depth: entry.depth,
  }));
}

/** One-line summary used in the status bar. */
export function summaryText(state: TomlToolState): string {
  const outcome = parseToml(state.toml);
  if (!outcome.ok) return outcome.error ?? 'invalid TOML';
  const structure = state.toml.trim() ? structureFor(state) : [];
  return `${structure.length} keys · ${state.mode}`;
}

export { describeValue, keyPaths };

export const tomlToJsonTool: Tool<TomlToolState> = {
  id: toolConfig.id,
  name: toolConfig.name,
  version: toolConfig.version,
  config: toolConfig,
  initialState: { ...DEFAULT_STATE },
  serialize: serializeState,
  deserialize: deserializeState,
  exporters: [
    { format: 'png', loader: () => import('./exporters/png') },
    { format: 'jpeg', loader: () => import('./exporters/jpeg') },
    { format: 'webp', loader: () => import('./exporters/webp') },
    { format: 'pdf', loader: () => import('./exporters/pdf') },
  ],
};
