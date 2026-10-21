import type { Song, Transition } from "../graph/types";
import type { AppState, Library, ViewState } from "./types";

/**
 * (De)serialization for the browser copy of the app state. Storage can hold
 * anything (old versions, hand edits), so parsing validates every field and
 * returns null when the data can't be used.
 */

export const STORAGE_KEY = "branchline:state:v1";

export const MIN_DEPTH = 1;
export const MAX_DEPTH = 6;

export function serializeState(state: AppState): string {
  return JSON.stringify(state);
}

type Json = Record<string, unknown>;
const isObject = (v: unknown): v is Json => typeof v === "object" && v !== null;
const str = (v: unknown, fallback = "") => (typeof v === "string" ? v : fallback);
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);

function toSong(v: unknown): Song | null {
  if (!isObject(v) || typeof v.id !== "string" || typeof v.title !== "string") return null;
  return {
    id: v.id,
    title: v.title,
    artist: str(v.artist),
    bpm: num(v.bpm),
    key: str(v.key),
    lengthSec: num(v.lengthSec),
    rating: num(v.rating),
  };
}

function toTransition(v: unknown): Transition | null {
  if (!isObject(v) || typeof v.id !== "string" || typeof v.from !== "string" || typeof v.to !== "string") {
    return null;
  }
  return { id: v.id, from: v.from, to: v.to, cueSec: num(v.cueSec) };
}

/** A usable view for `library`, keeping whatever parts of `raw` are valid. */
export function normalizeView(raw: unknown, library: Library): ViewState {
  const v = isObject(raw) ? raw : {};
  const has = (id: string) => library.songs.some((s) => s.id === id);
  const rootId = str(v.rootId);
  const targetId = str(v.targetId);
  const depth = num(v.depth);
  return {
    rootId: has(rootId) ? rootId : (library.songs[0]?.id ?? ""),
    direction: v.direction === "toward" ? "toward" : "ahead",
    depth: depth !== null && depth >= MIN_DEPTH && depth <= MAX_DEPTH ? Math.round(depth) : 3,
    targetId: has(targetId) ? targetId : "",
    positionSec: Math.max(0, num(v.positionSec) ?? 0),
  };
}

export function parseStoredState(raw: string | null): AppState | null {
  if (!raw) return null;
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isObject(data) || !isObject(data.library)) return null;
  const { songs, transitions } = data.library;
  if (!Array.isArray(songs) || !Array.isArray(transitions)) return null;

  const library: Library = {
    songs: songs.map(toSong).filter((s): s is Song => s !== null),
    transitions: transitions.map(toTransition).filter((t): t is Transition => t !== null),
  };
  return { library, view: normalizeView(data.view, library) };
}
