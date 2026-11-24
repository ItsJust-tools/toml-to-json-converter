'use client';

import React from 'react';
import { TOML_MODES, type TomlToolState } from '../types';

interface SidebarProps {
  state: TomlToolState;
  onChange: (next: TomlToolState) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ state, onChange }) => {
  return (
    <div className="p-4 space-y-6 text-sm overflow-y-auto h-full" data-testid="toml-sidebar">
      <div>
        <h3 className="mb-2 font-medium text-gray-900 dark:text-gray-100">Output mode</h3>
        <div className="space-y-1">
          {TOML_MODES.map((m) => (
            <label key={m.value} className="flex items-center gap-2 text-xs">
              <input
                type="radio"
                name="toml-mode"
                checked={state.mode === m.value}
                onChange={() => onChange({ ...state, mode: m.value })}
                data-testid={`radio-mode-${m.value}`}
              />
              <span className="text-gray-700 dark:text-gray-300">{m.label}</span>
              <span className="text-gray-500 dark:text-gray-400">{m.hint}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <h3 className="mb-2 font-medium text-gray-900 dark:text-gray-100">Saved conversions</h3>
        <p className="text-xs text-gray-600 dark:text-gray-300" data-testid="sidebar-history-count">
          {state.history.length} entr{state.history.length === 1 ? 'y' : 'ies'} in history
          {state.history.length > 0 ? ' (newest first)' : ''}
        </p>
      </div>

      <div>
        <h3 className="mb-2 font-medium text-gray-900 dark:text-gray-100">Supported TOML</h3>
        <ul className="space-y-1 text-xs text-gray-600 dark:text-gray-300">
          <li>
            Tables <code>[section]</code> and nested tables
          </li>
          <li>
            Arrays and arrays of tables <code>[[items]]</code>
          </li>
          <li>
            Inline tables <code>{'{ a = 1 }'}</code>
          </li>
          <li>Offset date-times, local dates and times</li>
          <li>Multi-line basic and literal strings</li>
          <li>Integers, floats, booleans</li>
        </ul>
      </div>

      <div>
        <h3 className="mb-2 font-medium text-gray-900 dark:text-gray-100">Share</h3>
        <p className="text-xs text-gray-600 dark:text-gray-300">
          Use the toolbar share button to create a URL containing the current TOML input and output
          mode; open it to restore this conversion.
        </p>
      </div>
    </div>
  );
};
