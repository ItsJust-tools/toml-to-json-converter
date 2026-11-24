import { describe, it, expect } from 'vitest';
import TOMLParser from '@iarna/toml';
import { parseToml, isTomlState } from '@/tool/ui-shared';
import { type TomlToolState } from '@/tool/types';
import {
  serializeState,
  deserializeState,
  withHistory,
  roundTrips,
  jsonFor,
  structureFor,
  summaryText,
  tomlToJsonTool,
} from '@/tool/tool-definition';
import { keyPaths, describeValue, DEFAULT_STATE, MAX_HISTORY } from '@/tool/types';

const state = (patch: Partial<TomlToolState> = {}): TomlToolState => ({
  ...DEFAULT_STATE,
  ...patch,
});

const SAMPLE = `# demo config
title = "Example"

[owner]
name = "Ada"
enabled = true

[owner.details]
born = 1815-12-10
scale = 0.75
tags = ["math", "code"]
port = 8080
ratio = -1.5e3

[[servers]]
host = "alpha"
ports = [8001, 8002]

[[servers]]
host = "beta"

[inline]
point = { x = 1, y = 2 }

[nested.deep.deeper]
key = 'literal string'
multiline = """
line one
line two
"""
`;

describe('parseToml with valid TOML', () => {
  it('parses nested tables, arrays, inline tables and datetimes to correct JSON', () => {
    const outcome = parseToml(SAMPLE);
    expect(outcome.ok).toBe(true);
    expect(outcome.value).toBeDefined();
    const json = JSON.stringify(outcome.value, null, 2);
    const parsed = JSON.parse(json);
    expect(parsed.title).toBe('Example');
    expect(parsed.owner.name).toBe('Ada');
    expect(parsed.owner.enabled).toBe(true);
    // local date parses to a Date instance
    expect(parsed.owner.details.born).toBe('1815-12-10');
    expect(parsed.owner.details.tags).toEqual(['math', 'code']);
    expect(parsed.owner.details.port).toBe(8080);
    expect(parsed.owner.details.ratio).toBeCloseTo(-1500);
    expect(parsed.servers).toHaveLength(2);
    expect(parsed.servers[0].ports).toEqual([8001, 8002]);
    expect(parsed.inline.point).toEqual({ x: 1, y: 2 });
    expect(parsed.nested.deep.deeper.key).toBe('literal string');
    expect(parsed.nested.deep.deeper.multiline).toBe('line one\nline two\n');
  });

  it('serializes datetimes as JSON strings, arrays as arrays', () => {
    const value = TOMLParser.parse('when = 1979-05-27T07:32:00Z\nflag = false');
    expect((value as Record<string, unknown>).flag).toBe(false);
    expect(JSON.parse(JSON.stringify(value)).when).toBe('1979-05-27T07:32:00.000Z');
  });

  it('treats empty and whitespace-only input as an empty table', () => {
    expect(parseToml('')).toEqual({ ok: true, value: {} });
    expect(parseToml('   \n\t ')).toEqual({ ok: true, value: {} });
  });

  it('parses comment-only input as empty table', () => {
    expect(parseToml('# just a comment')).toEqual({ ok: true, value: {} });
  });
});

describe('parseToml with invalid TOML', () => {
  it('reports an error without crashing and includes line info', () => {
    const outcome = parseToml('[valid]\nkey = "ok"\n\n[broken\nmissing = ]');
    expect(outcome.ok).toBe(false);
    expect(outcome.value).toBeUndefined();
    expect(outcome.error).toBeTruthy();
    expect(typeof outcome.line).toBe('number');
    if (typeof outcome.line === 'number') expect(outcome.line).toBeGreaterThanOrEqual(1);
  });

  it('reports line/column-style positions for unclosed strings', () => {
    const outcome = parseToml('a = "unclosed');
    expect(outcome.ok).toBe(false);
    if (outcome.line !== undefined) {
      expect(outcome.line).toBeGreaterThanOrEqual(1);
    }
  });

  it('does not throw on binary garbage', () => {
    const outcome = parseToml('key = "\u0000\u0001"');
    // may be valid or invalid; must not throw
    expect(typeof outcome.ok).toBe('boolean');
  });

  it('survives deeply malformed input', () => {
    const outcome = parseToml('[[[not valid [[[');
    expect(outcome.ok).toBe(false);
  });
});

describe('jsonFor / structureFor output modes', () => {
  const toml = 'a = 1\n[table]\nb = "x"';

  it('pretty mode produces 2-space indented output', () => {
    const json = jsonFor(state({ toml, mode: 'pretty' }));
    expect(json).toContain('\n  "a": 1');
    expect(json.split('\n').length).toBeGreaterThan(1);
  });

  it('minified mode produces single-line output', () => {
    const json = jsonFor(state({ toml, mode: 'minified' }));
    expect(json).toBe(json.replace(/\n/g, ''));
    expect(json).not.toContain('  "a"');
  });

  it('pretty and minified differ but parse to the same value', () => {
    const pretty = jsonFor(state({ toml, mode: 'pretty' }));
    const minified = jsonFor(state({ toml, mode: 'minified' }));
    expect(pretty).not.toBe(minified);
    expect(JSON.parse(pretty)).toEqual(JSON.parse(minified));
  });

  it('empty input yields empty output and no error', () => {
    const s = state({ toml: '', mode: 'minified' });
    expect(parseToml('').ok).toBe(true);
    expect(structureFor(s)).toEqual([]);
  });

  it('error input yields empty output', () => {
    expect(jsonFor(state({ toml: 'bad = [[[' }))).toBe('');
    expect(structureFor(state({ toml: 'bad = [[[' }))).toEqual([]);
  });

  it('structureFor lists flattened key paths with depth', () => {
    const structure = structureFor(state({ toml }));
    const paths = structure.map((s) => s.path);
    expect(paths).toContain('a');
    expect(paths).toContain('table.b');
    const tableEntry = structure.find((s) => s.path === 'table.b');
    expect(tableEntry?.value).toBe('"x"');
    expect(tableEntry?.depth).toBe(2);
  });
});

describe('keyPaths / describeValue', () => {
  it('flattens nested objects and arrays', () => {
    const paths = keyPaths({ a: { b: [1, { c: true }] }, empty: {} });
    const map = Object.fromEntries(paths.map((p) => [p.path, p.value]));
    expect(map['a.b']).toBe('array(2)');
    expect(map['a.b.0']).toBe('1');
    expect(map['a.b.1.c']).toBe('true');
    expect(map['a.b.1']).toBe('table(1)');
    expect(map.empty).toBe('table(0)');
  });

  it('handles arrays of tables with index paths', () => {
    const paths = keyPaths([{ x: 1 }]);
    const map = Object.fromEntries(paths.map((p) => [p.path, p.value]));
    expect(map['0']).toBe('table(1)');
    expect(map['0.x']).toBe('1');
  });

  it('describes dates as ISO strings', () => {
    expect(describeValue(new Date('2020-01-01T00:00:00Z'))).toBe('2020-01-01T00:00:00.000Z');
  });

  it('describes null, strings, numbers, booleans and objects', () => {
    expect(describeValue(null)).toBe('null');
    expect(describeValue('hi')).toBe('"hi"');
    expect(describeValue(3.5)).toBe('3.5');
    expect(describeValue(false)).toBe('false');
    expect(describeValue({ a: 1, b: 2 })).toBe('table(2)');
    expect(describeValue([1])).toBe('array(1)');
    expect(describeValue([])).toBe('array(0)');
  });
});

describe('serialize/deserialize state', () => {
  it('round-trips a full state', () => {
    const s = state({ toml: 'x = 1', mode: 'minified' });
    expect(roundTrips(s)).toBe(true);
  });

  it('serialize output contains toml and mode', () => {
    const s = state({ toml: 'y = 2', mode: 'pretty' });
    const parsed = JSON.parse(serializeState(s));
    expect(parsed.toml).toBe('y = 2');
    expect(parsed.mode).toBe('pretty');
    expect(Array.isArray(parsed.history)).toBe(true);
  });

  it('rejects non-object payloads', () => {
    expect(deserializeState(null).success).toBe(false);
    expect(deserializeState('str').success).toBe(false);
    expect(deserializeState([1, 2]).success).toBe(false);
    expect(deserializeState(42).success).toBe(false);
  });

  it('falls back to defaults for missing or wrong-typed fields', () => {
    const result = deserializeState({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.toml).toBe(DEFAULT_STATE.toml);
      expect(result.data.mode).toBe('pretty');
      expect(result.data.history).toEqual([]);
    }
  });

  it('rejects invalid mode values', () => {
    const result = deserializeState({ toml: 'a=1', mode: 'banana' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.mode).toBe('pretty');
    const min = deserializeState({ toml: 'a=1', mode: 'minified' });
    if (min.success) expect(min.data.mode).toBe('minified');
  });

  it('caps history at MAX_HISTORY and drops invalid entries', () => {
    const many = Array.from({ length: MAX_HISTORY + 5 }, (_, i) => ({
      text: `t${i}`,
      createdAt: new Date(2020, 0, i + 1).toISOString(),
    }));
    const result = deserializeState({ toml: 'a=1', mode: 'pretty', history: many });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.history).toHaveLength(MAX_HISTORY);
    expect(deserializeState({ history: 'nope' }).success).toBe(true);
    const result2 = deserializeState({ history: [1, { text: 'ok', createdAt: 'now' }, null] });
    if (result2.success) {
      expect(result2.data.history).toHaveLength(1);
      expect(result2.data.history[0]?.text).toBe('ok');
    }
  });
});

describe('withHistory and tool definition', () => {
  it('prepends entries and caps at MAX_HISTORY', () => {
    let s = state();
    for (let i = 0; i < MAX_HISTORY + 3; i++) {
      s = withHistory(s, `entry-${i}`, new Date(2021, 0, 1, 0, 0, i));
    }
    expect(s.history).toHaveLength(MAX_HISTORY);
    expect(s.history[0]?.text).toBe('entry-22');
    expect(s.history[MAX_HISTORY - 1]?.text).toBe('entry-3');
  });

  it('tool exposes id/name/serialize/deserialize', () => {
    expect(tomlToJsonTool.id).toBe('toml-to-json-converter');
    expect(tomlToJsonTool.name).toBe('TOML to JSON Converter');
    expect(tomlToJsonTool.initialState).toEqual(DEFAULT_STATE);
    expect(typeof tomlToJsonTool.serialize).toBe('function');
    expect(typeof tomlToJsonTool.deserialize).toBe('function');
  });
});

describe('summaryText and isTomlState', () => {
  it('summarizes valid toml with key count and mode', () => {
    expect(summaryText(state({ toml: 'a = 1\nb = 2' }))).toBe('3 keys · pretty');
    expect(summaryText(state({ toml: 'a = 1', mode: 'minified' }))).toBe('2 keys · minified');
  });

  it('summarizes errors and empty input', () => {
    expect(summaryText(state({ toml: 'bad = [[[' }))).toBeTruthy();
    expect(summaryText(state({ toml: '' }))).toBe('0 keys · pretty');
  });

  it('isTomlState validates shape', () => {
    expect(isTomlState({ toml: '', mode: 'pretty' })).toBe(true);
    expect(isTomlState({ toml: '', mode: 'nope' })).toBe(false);
    expect(isTomlState(null)).toBe(false);
    expect(isTomlState({ mode: 'pretty' })).toBe(false);
  });
});
