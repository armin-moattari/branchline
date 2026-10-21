/** A track in the DJ's library. */
export interface Song {
  id: string;
  title: string;
  artist: string;
  /** Beats per minute, if known. */
  bpm: number | null;
  /** Camelot key such as "8A" or "11B", or "" if unknown. */
  key: string;
  /** Track length in seconds, if known. */
  lengthSec: number | null;
  /** 0–5 stars, if known. */
  rating: number | null;
}

/**
 * A directed edge: "I know `from` mixes into `to`".
 * `cueSec` is where in `from` the mix starts, if the DJ recorded it.
 */
export interface Transition {
  id: string;
  from: string;
  to: string;
  cueSec: number | null;
}

/** Which way to walk the graph. */
export type Direction = "ahead" | "toward";

/** One node in a tree unrolled from the graph. */
export interface TreeNode {
  songId: string;
  /** The edge that led here, or null for the root. */
  via: Transition | null;
  depth: number;
  /** True when this song already appears earlier on the same path. Loops are never expanded. */
  loop: boolean;
  /** True when this branch starts with a transition whose cue point has already passed. */
  passed: boolean;
  children: TreeNode[];
}
