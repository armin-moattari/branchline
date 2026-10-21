import type { Direction, Song, Transition } from "../graph/types";

/** Everything the DJ has saved. */
export interface Library {
  songs: Song[];
  transitions: Transition[];
}

/** What the tree view is currently showing. */
export interface ViewState {
  rootId: string;
  direction: Direction;
  /** How many transitions deep to unroll, 1–6. */
  depth: number;
  /** Pathfinder target, or "" for none. */
  targetId: string;
  /** Playing position in the root song, in seconds. */
  positionSec: number;
}

export interface AppState {
  library: Library;
  view: ViewState;
}

export type IdFactory = () => string;
