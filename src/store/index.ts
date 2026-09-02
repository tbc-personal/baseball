/**
 * src/store/ public surface: save schema, save codes, and localStorage
 * persistence (GAME_DESIGN.md 6, 6.1). Pure TypeScript + browser APIs
 * only -- no Preact/UI imports here (see storage.ts for how it stays
 * testable under Node/vitest, where localStorage doesn't exist).
 */

export type { AppState, SaveEnvelope, AnyVersionEnvelope, DecodeFailureReason, DecodeResult, SavePreview } from './types'
export { SAVE_SCHEMA_VERSION } from './types'

export type { StorageLike } from './storage'
export { createMemoryStorage, getBrowserStorage } from './storage'

export { migrate, SchemaTooNewError, DEFAULT_TEAM_NAME } from './migrate'

export { exportSaveCode, decodeSaveCode } from './codec'
export type { ExportOptions } from './codec'

export { previewOf } from './preview'

export {
  SAVE_KEY,
  UNDO_KEY,
  freshAppState,
  save,
  load,
  loadLocalEnvelope,
  applyImportedSave,
  undoLoad
} from './persistence'
