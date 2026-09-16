/**
 * Which build this is: the stable release, or the latest build off the
 * preview branch.
 *
 * `__BUILD_CHANNEL__` is replaced at build time by vite.config.ts. It is
 * undefined under vitest, which does not go through that config's `define`,
 * so everything here falls back to 'stable' -- the tests describe the real
 * game, not a preview of it.
 *
 * Two things depend on this, and both matter more than they look:
 *
 * - **The save key** (store/persistence.ts). GitHub Pages serves both
 *   builds from one origin, and localStorage is per-origin, not per-path,
 *   so without a separate key the preview build would read and overwrite
 *   the season being played on the stable one. The engine differs between
 *   the two by construction, which is the whole point of a preview, so
 *   that save would not merely be shared -- it would be wrong.
 * - **The service worker** (vite.config.ts). The stable build registers one
 *   scoped to /baseball/, which contains the preview path. A second worker
 *   there would fight it for the same scope, so the preview build ships
 *   without one. Playtesting wants the newest code on every reload anyway.
 */

declare const __BUILD_CHANNEL__: string | undefined

export type BuildChannel = 'stable' | 'preview'

export const BUILD_CHANNEL: BuildChannel =
  typeof __BUILD_CHANNEL__ === 'string' && __BUILD_CHANNEL__ === 'preview' ? 'preview' : 'stable'

export const IS_PREVIEW = BUILD_CHANNEL === 'preview'
