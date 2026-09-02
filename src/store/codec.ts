/**
 * Save code encoding/decoding (GAME_DESIGN.md 6.1).
 *
 * Format: `SS1-<payload>-<check>` where payload is
 * base64url(deflate-raw(JSON.stringify(envelope))), no padding, and check
 * is 4 hex chars of FNV-1a-32(payload), low 16 bits. `SS0-` is the
 * fallback when `CompressionStream` is unavailable: base64url of the raw
 * JSON, same checksum scheme. The importer accepts both.
 */

import type { AppState, DecodeResult, SaveEnvelope } from './types'
import { SAVE_SCHEMA_VERSION } from './types'
import { migrate, SchemaTooNewError } from './migrate'
import { isEnvelopeLike, isAppState } from './validate'

const MAGIC_COMPRESSED = 'SS1'
const MAGIC_RAW = 'SS0'

// ----------------------------------------------------------------------
// FNV-1a 32-bit checksum, low 16 bits as 4 hex chars
// ----------------------------------------------------------------------

function fnv1a32(str: string): number {
  let hash = 0x811c9dc5
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 0
}

function checksum4(payload: string): string {
  const low16 = fnv1a32(payload) & 0xffff
  return low16.toString(16).padStart(4, '0')
}

// ----------------------------------------------------------------------
// base64url, no padding
// ----------------------------------------------------------------------

function bytesToBase64url(bytes: Uint8Array): string {
  let binary = ''
  const chunkSize = 0x2000
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize))
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function base64urlToBytes(b64url: string): Uint8Array {
  const base64 = b64url.replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

// ----------------------------------------------------------------------
// Compression (feature-detected, never assumed)
// ----------------------------------------------------------------------

function hasCompression(): boolean {
  return typeof CompressionStream !== 'undefined' && typeof DecompressionStream !== 'undefined'
}

async function deflateRaw(bytes: Uint8Array): Promise<Uint8Array> {
  const stream = new CompressionStream('deflate-raw')
  const writer = stream.writable.getWriter()
  // Re-wrap: guarantees a plain ArrayBuffer-backed view, which is what
  // the stream APIs' types want (a Uint8Array from TextEncoder/subarray
  // can otherwise be typed against the wider ArrayBufferLike).
  void writer.write(new Uint8Array(bytes))
  void writer.close()
  return new Uint8Array(await new Response(stream.readable).arrayBuffer())
}

async function inflateRaw(bytes: Uint8Array): Promise<Uint8Array> {
  const stream = new DecompressionStream('deflate-raw')
  const writer = stream.writable.getWriter()
  void writer.write(new Uint8Array(bytes))
  void writer.close()
  return new Uint8Array(await new Response(stream.readable).arrayBuffer())
}

// ----------------------------------------------------------------------
// Export
// ----------------------------------------------------------------------

export interface ExportOptions {
  /** Injectable clock, for tests. Defaults to `new Date().toISOString()`. */
  now?: () => string
}

/**
 * Build the save code for `state`. Async because compression (when
 * available) requires it. Falls back to the uncompressed `SS0-` form when
 * `CompressionStream` is not present in this runtime.
 */
export async function exportSaveCode(state: AppState, device: string, options: ExportOptions = {}): Promise<string> {
  const envelope: SaveEnvelope = {
    v: SAVE_SCHEMA_VERSION,
    savedAt: options.now ? options.now() : new Date().toISOString(),
    device,
    state
  }
  const json = JSON.stringify(envelope)
  const jsonBytes = new TextEncoder().encode(json)

  if (hasCompression()) {
    const compressed = await deflateRaw(jsonBytes)
    const payload = bytesToBase64url(compressed)
    return `${MAGIC_COMPRESSED}-${payload}-${checksum4(payload)}`
  }

  const payload = bytesToBase64url(jsonBytes)
  return `${MAGIC_RAW}-${payload}-${checksum4(payload)}`
}

// ----------------------------------------------------------------------
// Decode (never applies, never throws a raw error -- 6.1)
// ----------------------------------------------------------------------

// Anchored so the LAST 5 characters ("-" + 4 hex) are always the check,
// regardless of how many "-"/"_" the base64url payload itself contains
// (payload is greedy + backtracking, but the hex group is pinned to the
// literal end of the string, so there is only ever one candidate split).
const CODE_SHAPE = /^(SS[01])-(.+)-([0-9a-fA-F]{4})$/

export async function decodeSaveCode(rawCode: string): Promise<DecodeResult> {
  const code = rawCode.trim()

  if (!code.startsWith(`${MAGIC_COMPRESSED}-`) && !code.startsWith(`${MAGIC_RAW}-`)) {
    return {
      ok: false,
      reason: 'bad-prefix',
      message: 'Not a save code -- it should start with "SS1-" or "SS0-".'
    }
  }

  const match = CODE_SHAPE.exec(code)
  if (!match) {
    // The only way a string with a good prefix fails this shape is a
    // missing/short "-<4 hex>" tail -- i.e. the paste got cut off.
    return {
      ok: false,
      reason: 'checksum-mismatch',
      message: `Checksum mismatch -- looks truncated: ${code.length} chars.`
    }
  }

  const [, magic, payload, check] = match
  const expected = checksum4(payload)
  if (expected.toLowerCase() !== check.toLowerCase()) {
    return {
      ok: false,
      reason: 'checksum-mismatch',
      message: 'Checksum mismatch -- this save code may have been altered.'
    }
  }

  let json: string
  try {
    const bytes = base64urlToBytes(payload)
    if (magic === MAGIC_COMPRESSED) {
      if (!hasCompression()) {
        return {
          ok: false,
          reason: 'unreadable',
          message: 'This device cannot decompress this save code.'
        }
      }
      json = new TextDecoder().decode(await inflateRaw(bytes))
    } else {
      json = new TextDecoder().decode(bytes)
    }
  } catch {
    return { ok: false, reason: 'unreadable', message: 'This save code could not be read.' }
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(json)
  } catch {
    return { ok: false, reason: 'unreadable', message: 'This save code could not be read.' }
  }

  if (!isEnvelopeLike(parsed)) {
    return { ok: false, reason: 'unreadable', message: 'This save code could not be read.' }
  }

  try {
    const migrated = migrate(parsed)
    if (!isAppState(migrated.state)) {
      return { ok: false, reason: 'unreadable', message: 'This save code could not be read.' }
    }
    return { ok: true, envelope: migrated }
  } catch (err) {
    if (err instanceof SchemaTooNewError) {
      return {
        ok: false,
        reason: 'schema-too-new',
        message: 'This save is from a newer version of the game; update this device.'
      }
    }
    return { ok: false, reason: 'unreadable', message: 'This save code could not be read.' }
  }
}
