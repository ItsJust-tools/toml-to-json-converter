import { DEFAULT_STATE } from './types';

export { default as toolConfig } from './tool.config';
export { templateBaseVersion } from './template-metadata';
export { templateMetadata, getPublicSiteUrl } from './template-metadata';
export {
  tomlToJsonTool,
  serializeState,
  deserializeState,
  withHistory,
  roundTrips,
  jsonFor,
  structureFor,
  summaryText,
} from './tool-definition';
export { Canvas } from './components/Canvas';
export { Sidebar } from './components/Sidebar';
export { Toolbar } from './components/Toolbar';
export { parseToml, isTomlState, isState } from './ui-shared';
export { keyPaths, describeValue, DEFAULT_STATE, MAX_HISTORY, TOML_MODES } from './types';
export type { ToolMode, TomlToolState, HistoryEntry, KeyPathEntry, ParseOutcome } from './types';

const SAMPLE_TOML = DEFAULT_STATE.toml;
export { SAMPLE_TOML };
