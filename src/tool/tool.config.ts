import type { ExportFormat } from '@itsjust/core';
export const toolConfig = {
  id: 'toml-to-json-converter',
  name: 'TOML to JSON Converter',
  description:
    'Convert TOML configuration files to JSON with live parsing, validation, and copyable output.',
  version: '1.0.0',
  exportFormats: ['png', 'jpeg', 'webp', 'pdf'] as unknown as ExportFormat[],
  features: {
    export: true,
    autoSave: true,
    undoRedo: false,
    sidebar: true,
    statusBar: true,
    darkMode: true,
  },
  theme: {
    brand: 'TOML to JSON Converter',
  },
};

export default toolConfig;
