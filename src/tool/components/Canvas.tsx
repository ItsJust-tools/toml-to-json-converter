'use client';

import React from 'react';
import { parseToml } from '../ui-shared';
import { jsonFor, structureFor } from '../tool-definition';
import { TOML_MODES, type TomlToolState, type HistoryEntry } from '../types';

interface CanvasProps {
  state: TomlToolState;
  onChange?: (state: TomlToolState) => void;
  onSaveHistory?: (text: string) => void;
}

const textInputClass =
  'mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 font-mono text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100';

function CopyButton({ value, testid }: { value: string; testid?: string }) {
  const [copied, setCopied] = React.useState(false);
  const handleCopy = React.useCallback(async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable; ignore
    }
  }, [value]);
  return (
    <button
      type="button"
      onClick={handleCopy}
      data-testid={testid}
      className="text-xs px-2 py-1 rounded border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800"
      aria-label="Copy value"
    >
      {copied ? 'Copied!' : 'Copy'}
    </button>
  );
}

function highlightJson(json: string): React.ReactNode {
  if (!json) return null;
  const tokens = json.split(
    /("(?:\\.|[^"\\])*"|\b(?:true|false|null)\b|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g
  );
  return tokens.map((token, i) => {
    if (!token) return null;
    if (token.startsWith('"')) {
      const isKey = /:\s*$/.test(tokens.slice(0, i + 1).join(''));
      return (
        <span
          key={i}
          className={
            isKey ? 'text-sky-600 dark:text-sky-400' : 'text-emerald-600 dark:text-emerald-400'
          }
        >
          {token}
        </span>
      );
    }
    if (/^(true|false|null)$/.test(token) || /^-?\d/.test(token)) {
      return (
        <span key={i} className="text-amber-600 dark:text-amber-400">
          {token}
        </span>
      );
    }
    return <React.Fragment key={i}>{token}</React.Fragment>;
  });
}

export const Canvas: React.FC<CanvasProps> = ({ state, onChange, onSaveHistory }) => {
  const update = (patch: Partial<TomlToolState>) => onChange?.({ ...state, ...patch });
  const outcome = parseToml(state.toml);
  const json = jsonFor(state);
  const structure = state.toml.trim() ? structureFor(state) : [];
  const isEmpty = !state.toml.trim();

  const handleDownload = React.useCallback(() => {
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'converted.json';
    a.click();
    URL.revokeObjectURL(url);
  }, [json]);

  const handleFile = React.useCallback(
    async (file: File | undefined) => {
      if (!file) return;
      const text = await file.text();
      update({ toml: text });
      if (onSaveHistory) onSaveHistory(`Loaded ${file.name}`);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state, onChange, onSaveHistory]
  );

  return (
    <div className="h-full overflow-y-auto p-4" data-testid="toml-canvas">
      <div className="grid gap-4 lg:grid-cols-2">
        <section aria-label="TOML input">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-medium text-gray-900 dark:text-gray-100">TOML input</h2>
            <label className="cursor-pointer text-xs text-violet-600 hover:underline dark:text-violet-400">
              Upload .toml
              <input
                type="file"
                accept=".toml,text/plain"
                className="hidden"
                data-testid="input-file"
                onChange={(e) => void handleFile(e.target.files?.[0])}
              />
            </label>
          </div>
          <textarea
            value={state.toml}
            onChange={(e) => {
              update({ toml: e.target.value });
            }}
            onBlur={() => {
              if (onSaveHistory && state.toml.trim()) onSaveHistory('TOML edited');
            }}
            rows={14}
            spellCheck={false}
            data-testid="input-toml"
            placeholder="# Paste TOML here"
            className={`${textInputClass} min-h-[280px] resize-y`}
          />
        </section>

        <section aria-label="JSON output">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-medium text-gray-900 dark:text-gray-100">JSON output</h2>
            <span className="flex gap-2">
              <CopyButton value={json} testid="btn-copy-output" />
              <button
                type="button"
                onClick={handleDownload}
                data-testid="btn-download-json"
                disabled={!json}
                className="text-xs px-2 py-1 rounded border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50"
                aria-label="Download JSON"
              >
                Download .json
              </button>
            </span>
          </div>
          {isEmpty ? (
            <div
              className="rounded-md border border-dashed border-gray-300 p-6 text-center text-xs text-gray-500 dark:border-gray-700 dark:text-gray-400"
              data-testid="output-empty"
            >
              Paste TOML to see JSON output here.
            </div>
          ) : !outcome.ok ? (
            <div
              className="rounded-md border border-red-300 bg-red-50 p-3 text-xs text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300"
              role="alert"
              data-testid="output-error"
            >
              <p className="font-semibold">Invalid TOML</p>
              <p className="mt-1 break-words" data-testid="error-message">
                {outcome.error}
              </p>
              {outcome.line !== undefined ? (
                <p className="mt-1" data-testid="error-position">
                  Line {outcome.line}
                  {outcome.column !== undefined ? `, column ${outcome.column}` : ''}
                </p>
              ) : null}
            </div>
          ) : (
            <pre
              className="max-h-[340px] min-h-[280px] overflow-auto rounded-md border border-gray-200 bg-gray-50 p-3 font-mono text-xs text-gray-800 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200"
              data-testid="output-json"
            >
              <code>{highlightJson(json)}</code>
            </pre>
          )}
        </section>
      </div>

      <section aria-label="Structure preview" className="mt-6">
        <h2 className="mb-2 text-sm font-medium text-gray-900 dark:text-gray-100">
          Parsed key structure
        </h2>
        {structure.length === 0 ? (
          <p className="text-xs text-gray-500 dark:text-gray-400" data-testid="structure-empty">
            {isEmpty ? 'No input parsed yet.' : 'Fix the TOML error to see the key structure.'}
          </p>
        ) : (
          <ul
            className="space-y-1 rounded-md border border-gray-200 bg-white p-3 font-mono text-xs dark:border-gray-800 dark:bg-gray-900"
            data-testid="structure-list"
          >
            {structure.map((entry) => (
              <li
                key={entry.path}
                className="flex justify-between gap-4"
                style={{ paddingLeft: `${Math.min(entry.depth, 6) * 12}px` }}
              >
                <span className="text-gray-700 dark:text-gray-300">{entry.path}</span>
                <span className="text-gray-500 dark:text-gray-500">{entry.value}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {state.history.length > 0 ? (
        <section aria-label="Conversion history" className="mt-6">
          <h2 className="mb-2 text-sm font-medium text-gray-900 dark:text-gray-100">
            Recent conversions (newest first)
          </h2>
          <ul
            className="space-y-1 text-xs text-gray-600 dark:text-gray-400"
            data-testid="history-list"
          >
            {state.history.map((entry: HistoryEntry) => (
              <li key={`${entry.createdAt}-${entry.text}`} className="flex justify-between gap-4">
                <span>{entry.text}</span>
                <time dateTime={entry.createdAt}>{new Date(entry.createdAt).toLocaleString()}</time>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <p className="mt-4 text-xs text-gray-400">
        Format: {state.mode === 'pretty' ? 'pretty (2-space indent)' : 'minified'} ·{' '}
        {TOML_MODES.length} output modes available
      </p>
    </div>
  );
};
