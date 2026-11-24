'use client';

import React from 'react';
import { TOML_MODES, type TomlToolState } from '../types';

interface ToolbarProps {
  state: TomlToolState;
  onChange: (next: TomlToolState) => void;
  onClear: () => void;
  onCopy?: () => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({ state, onChange, onClear, onCopy }) => {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-center gap-2" role="group" aria-label="TOML converter controls">
        <div
          className="flex overflow-hidden rounded-md border border-gray-300 dark:border-gray-700"
          role="group"
          aria-label="Output format"
        >
          {TOML_MODES.map((m) => (
            <button
              key={m.value}
              type="button"
              onClick={() => onChange({ ...state, mode: m.value })}
              data-testid={`btn-mode-${m.value}`}
              aria-pressed={state.mode === m.value}
              className={`px-3 py-1.5 text-xs font-medium ${
                state.mode === m.value
                  ? 'bg-violet-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
        {onCopy ? (
          <button
            type="button"
            onClick={onCopy}
            data-testid="btn-copy-json"
            className="rounded-md bg-violet-500 px-4 py-1.5 text-xs font-medium text-white hover:bg-violet-600"
          >
            Copy JSON
          </button>
        ) : null}
        <button
          type="button"
          onClick={onClear}
          data-testid="btn-clear"
          className="rounded-md bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
        >
          Reset
        </button>
        {state.history.length > 0 ? (
          <button
            type="button"
            onClick={() => onChange({ ...state, history: [] })}
            data-testid="btn-clear-history"
            className="rounded-md bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            Clear history
          </button>
        ) : null}
      </div>
    </div>
  );
};
