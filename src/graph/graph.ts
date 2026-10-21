import type { Direction, Song, Transition, TreeNode } from "./types";

/**
 * Adjacency lists for both directions, built once and reused by every traversal.
 * Transitions that point at unknown songs are ignored.
 */
export class TransitionGraph {
  readonly songs: ReadonlyMap<string, Song>;
  private readonly outgoing = new Map<string, Transition[]>();
  private readonly incoming = new Map<string, Transition[]>();

  constructor(songs: readonly Song[], transitions: readonly Transition[]) {
    this.songs = new Map(songs.map((s) => [s.id, s]));
    for (const s of songs) {
      this.outgoing.set(s.id, []);
      this.incoming.set(s.id, []);
    }
    for (const t of transitions) {
      const out = this.outgoing.get(t.from);
      const inn = this.incoming.get(t.to);
      if (out && inn) {
        out.push(t);
        inn.push(t);
      }
    }
  }

  get songCount(): number {
    return this.songs.size;
  }

  /** Edges leaving `songId` ("what can I play next?"). */
  out(songId: string): readonly Transition[] {
    return this.outgoing.get(songId) ?? [];
  }

  /** Edges arriving at `songId` ("what leads into this?"). */
  in(songId: string): readonly Transition[] {
    return this.incoming.get(songId) ?? [];
  }

  /** Neighbours in the given direction, paired with the edge used to reach them. */
  step(songId: string, direction: Direction): { next: string; via: Transition }[] {
    return direction === "ahead"
      ? this.out(songId).map((via) => ({ next: via.to, via }))
      : this.in(songId).map((via) => ({ next: via.from, via }));
  }
}

/**
 * Pathfinder: fewest transitions from every song to `targetId`.
 *
 * One BFS over the reversed graph labels every song that can reach the target,
 * in O(V + E). Songs missing from the result cannot reach it.
 */
export function distancesTo(graph: TransitionGraph, targetId: string): Map<string, number> {
  const dist = new Map<string, number>();
  if (!graph.songs.has(targetId)) return dist;
  dist.set(targetId, 0);
  const queue: string[] = [targetId];
  for (let head = 0; head < queue.length; head++) {
    const v = queue[head]!;
    const d = dist.get(v)!;
    for (const edge of graph.in(v)) {
      if (!dist.has(edge.from)) {
        dist.set(edge.from, d + 1);
        queue.push(edge.from);
      }
    }
  }
  return dist;
}

/**
 * One shortest route from `fromId` to `targetId`, as a list of song ids,
 * or null if there is none. Ties are broken by edge insertion order.
 */
export function shortestPath(
  graph: TransitionGraph,
  fromId: string,
  targetId: string,
  dist: Map<string, number> = distancesTo(graph, targetId),
): string[] | null {
  if (!dist.has(fromId)) return null;
  const path = [fromId];
  let current = fromId;
  while (current !== targetId) {
    const d = dist.get(current)!;
    const next = graph.out(current).find((e) => dist.get(e.to) === d - 1);
    if (!next) return null; // unreachable if dist is consistent
    current = next.to;
    path.push(current);
  }
  return path;
}

export interface BuildTreeOptions {
  direction: Direction;
  /** How many transitions deep to expand. */
  maxDepth: number;
  /**
   * Playing position (seconds) in the root song. In "ahead" mode, root transitions
   * whose cue point is before this are marked `passed`, along with their subtree.
   */
  positionSec?: number;
  /** Safety cap on total nodes so huge graphs don't freeze the UI. */
  nodeLimit?: number;
}

export interface BuildTreeResult {
  tree: TreeNode | null;
  nodeCount: number;
  truncated: boolean;
}

/**
 * Unroll the graph into a tree rooted at `rootId` using a depth-limited DFS.
 *
 * A song already on the current root-to-node path becomes a `loop` leaf instead of
 * being expanded, so cycles (A → B → A) terminate. The same song can still appear
 * in different branches; that is the point of the view.
 */
export function buildTree(
  graph: TransitionGraph,
  rootId: string,
  options: BuildTreeOptions,
): BuildTreeResult {
  const { direction, maxDepth, positionSec = 0, nodeLimit = 500 } = options;
  if (!graph.songs.has(rootId)) return { tree: null, nodeCount: 0, truncated: false };

  let nodeCount = 0;
  let truncated = false;
  const onPath = new Set<string>([rootId]);

  const visit = (songId: string, depth: number, via: Transition | null, passed: boolean): TreeNode => {
    nodeCount++;
    const node: TreeNode = { songId, via, depth, loop: false, passed, children: [] };
    if (depth >= maxDepth) return node;

    for (const { next, via: edge } of graph.step(songId, direction)) {
      if (nodeCount >= nodeLimit) {
        truncated = true;
        break;
      }
      const isPassed =
        passed ||
        (direction === "ahead" && depth === 0 && edge.cueSec !== null && edge.cueSec < positionSec);

      if (onPath.has(next)) {
        nodeCount++;
        node.children.push({ songId: next, via: edge, depth: depth + 1, loop: true, passed: isPassed, children: [] });
        continue;
      }
      onPath.add(next);
      node.children.push(visit(next, depth + 1, edge, isPassed));
      onPath.delete(next);
    }
    return node;
  };

  const tree = visit(rootId, 0, null, false);
  return { tree, nodeCount, truncated };
}
