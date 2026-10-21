import type { Song, Transition } from "../src/graph/types";

export function song(id: string, overrides: Partial<Song> = {}): Song {
  return { id, title: id.toUpperCase(), artist: "", bpm: null, key: "", lengthSec: 360, rating: null, ...overrides };
}

let n = 0;
export function edge(from: string, to: string, cueSec: number | null = null): Transition {
  return { id: `e${n++}`, from, to, cueSec };
}
