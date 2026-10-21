import type { Song } from "../graph/types";
import { transitionsFromSet } from "../import/playlist";
import type { RekordboxImport } from "../import/rekordbox";
import { findSong, newId } from "./library";
import type { IdFactory, Library } from "./types";

export interface RekordboxImportResult {
  library: Library;
  /** Tracks added as new songs. */
  newSongs: number;
  /** Tracks that were already in the library. */
  matchedSongs: number;
  newTransitions: number;
}

/**
 * Merge the chosen playlists of a parsed Rekordbox export into the library.
 *
 * Only tracks that appear in a chosen playlist are brought in. A track already in
 * the library (see `findSong`) is reused, and Rekordbox only fills in fields the
 * library left empty, so the DJ's own edits win. Each back-to-back pair in a
 * playlist becomes a transition unless that pair is already saved, which makes
 * importing the same playlist twice a no-op.
 */
export function applyRekordboxImport(
  library: Library,
  parsed: RekordboxImport,
  playlistIndexes: readonly number[],
  makeId: IdFactory = newId,
): RekordboxImportResult {
  const chosen = new Set(playlistIndexes);
  const playlists = parsed.playlists.filter((_, i) => chosen.has(i));
  const rbSongs = new Map(parsed.songs.map((s) => [s.id, s]));

  const songs = [...library.songs];
  const takenIds = new Set(songs.map((s) => s.id));
  /** Rekordbox song id → library song id. */
  const resolved = new Map<string, string>();
  let newSongs = 0;
  let matchedSongs = 0;

  const resolve = (rbId: string): string | undefined => {
    const known = resolved.get(rbId);
    if (known) return known;
    const rb = rbSongs.get(rbId);
    if (!rb) return undefined;

    const match = findSong(songs, rb.title, rb.artist);
    let id: string;
    if (match) {
      const index = songs.indexOf(match);
      songs[index] = fillMissing(match, rb);
      id = match.id;
      matchedSongs++;
    } else {
      id = takenIds.has(rb.id) ? makeId() : rb.id;
      songs.push({ ...rb, id });
      takenIds.add(id);
      newSongs++;
    }
    resolved.set(rbId, id);
    return id;
  };

  let transitions = library.transitions;
  for (const playlist of playlists) {
    const order = playlist.songIds.map(resolve).filter((id): id is string => id !== undefined);
    transitions = [...transitions, ...transitionsFromSet(order, transitions, makeId)];
  }

  return {
    library: { songs, transitions },
    newSongs,
    matchedSongs,
    newTransitions: transitions.length - library.transitions.length,
  };
}

function fillMissing(song: Song, from: Song): Song {
  return {
    ...song,
    bpm: song.bpm ?? from.bpm,
    key: song.key || from.key,
    lengthSec: song.lengthSec ?? from.lengthSec,
    rating: song.rating ?? from.rating,
  };
}
