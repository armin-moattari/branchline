import type { Song, Transition } from "../graph/types";
import { toCamelot } from "../import/camelot";
import { transitionsFromSet } from "../import/playlist";
import type { IdFactory, Library } from "./types";

/**
 * Immutable edits to a Library. Each returns a new Library, or the same object
 * when the edit is rejected, so callers can skip a re-render.
 */

export const newId: IdFactory = () => crypto.randomUUID();

export interface NewSong {
  title: string;
  artist: string;
  bpm: number | null;
  /** Any notation `toCamelot` understands. */
  key: string;
  lengthSec: number | null;
}

export function addSong(library: Library, input: NewSong, makeId: IdFactory = newId): Library {
  const title = input.title.trim();
  if (!title) return library;
  const song = {
    id: makeId(),
    title,
    artist: input.artist.trim(),
    bpm: input.bpm,
    key: toCamelot(input.key),
    lengthSec: input.lengthSec,
    rating: null,
  };
  return { ...library, songs: [...library.songs, song] };
}

/** Remove a song along with every transition into or out of it. */
export function removeSong(library: Library, songId: string): Library {
  return {
    songs: library.songs.filter((s) => s.id !== songId),
    transitions: library.transitions.filter((t) => t.from !== songId && t.to !== songId),
  };
}

/**
 * Save "from mixes into to". If that pair already exists, only its cue point is
 * updated (and only when a new one is given), so a pair is never stored twice.
 */
export function saveTransition(
  library: Library,
  input: Omit<Transition, "id">,
  makeId: IdFactory = newId,
): Library {
  const { from, to, cueSec } = input;
  const known = (id: string) => library.songs.some((s) => s.id === id);
  if (from === to || !known(from) || !known(to)) return library;

  const existing = library.transitions.find((t) => t.from === from && t.to === to);
  if (existing) {
    if (cueSec === null) return library;
    return {
      ...library,
      transitions: library.transitions.map((t) => (t === existing ? { ...t, cueSec } : t)),
    };
  }
  return { ...library, transitions: [...library.transitions, { id: makeId(), from, to, cueSec }] };
}

export function removeTransition(library: Library, transitionId: string): Library {
  return { ...library, transitions: library.transitions.filter((t) => t.id !== transitionId) };
}

/**
 * The song an imported track refers to: same title, and same artist when both
 * sides have one, ignoring case. Imports use this so a track is never added twice.
 */
export function findSong(songs: readonly Song[], title: string, artist: string): Song | undefined {
  const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();
  return songs.find((s) => same(s.title, title) && (!artist || !s.artist || same(s.artist, artist)));
}

export interface PastedTrack {
  artist: string;
  title: string;
}

/** One track per line: "Artist - Title" or just "Title". Blank lines are skipped. */
export function parsePastedSet(text: string): PastedTrack[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const dash = line.indexOf(" - ");
      return dash > 0
        ? { artist: line.slice(0, dash).trim(), title: line.slice(dash + 3).trim() }
        : { artist: "", title: line };
    });
}

export interface PasteImportResult {
  library: Library;
  newSongs: number;
  newTransitions: number;
}

/**
 * Import a played set pasted as text. Each line is matched to an existing song by
 * title (and artist, when both sides have one), case-insensitively; unknown tracks
 * are added. Every back-to-back pair becomes a transition.
 */
export function importPastedSet(library: Library, text: string, makeId: IdFactory = newId): PasteImportResult {
  const songs = [...library.songs];
  let newSongs = 0;

  const orderedIds = parsePastedSet(text).map(({ artist, title }) => {
    const match = findSong(songs, title, artist);
    if (match) return match.id;
    const song = { id: makeId(), title, artist, bpm: null, key: "", lengthSec: null, rating: null };
    songs.push(song);
    newSongs++;
    return song.id;
  });

  const created = transitionsFromSet(orderedIds, library.transitions, makeId);
  return {
    library: { songs, transitions: [...library.transitions, ...created] },
    newSongs,
    newTransitions: created.length,
  };
}
