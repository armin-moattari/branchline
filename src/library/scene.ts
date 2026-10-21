import { buildTree, distancesTo, type TransitionGraph } from "../graph/graph";
import { layoutTree } from "../graph/layout";
import { formatTime } from "./time";
import type { ViewState } from "./types";

/**
 * Turns the graph and the current view into everything the tree canvas draws, in
 * pixels: node boxes, edge curves with their labels, and the numbers the
 * "Under the hood" panel explains. Kept free of React so it can be tested directly.
 */

// The 100px gap between columns fits an edge label like "@4:40  +1 BPM" without a node covering it.
export const SIZES = { COL_W: 310, ROW_H: 82, NODE_W: 210, NODE_H: 64, PAD: 24 } as const;
const { COL_W, ROW_H, NODE_W, NODE_H, PAD } = SIZES;

/** Never draw more than this many nodes, so wide graphs at high depth stay responsive. */
export const NODE_LIMIT = 350;

export type Badge = { kind: "target" } | { kind: "distance"; steps: number };

export interface SceneNode {
  key: string;
  songId: string;
  x: number;
  y: number;
  isRoot: boolean;
  /** Already earlier on this path; drawn as a stub that is not expanded. */
  loop: boolean;
  /** Its branch is passed or it can't reach the target. */
  dim: boolean;
  badge: Badge | null;
}

/** "line" is a plain saved transition, "accent" is on the route to the target, "danger" is passed. */
export type EdgeTone = "line" | "accent" | "danger";

export interface SceneEdge {
  key: string;
  /** Playing order: `from` is the track that is playing, `to` the one mixed in. */
  from: string;
  to: string;
  /** SVG path, drawn from the earlier track to the later one. */
  path: string;
  labelX: number;
  labelY: number;
  /** e.g. "@4:10  +2 BPM", or "" when nothing is known. */
  label: string;
  tone: EdgeTone;
}

export interface Scene {
  width: number;
  height: number;
  nodes: SceneNode[];
  edges: SceneEdge[];
  nodeCount: number;
  truncated: boolean;
  /** Songs that can reach the target, not counting the target; null without one. */
  reachableCount: number | null;
  /** Root transitions whose cue is behind the playing position (look ahead only). */
  passedCount: number;
}

export function buildScene(graph: TransitionGraph, view: ViewState): Scene | null {
  const { rootId, direction, depth, targetId, positionSec } = view;
  const { tree, nodeCount, truncated } = buildTree(graph, rootId, {
    direction,
    maxDepth: depth,
    positionSec,
    nodeLimit: NODE_LIMIT,
  });
  if (!tree) return null;

  const dist = targetId && graph.songs.has(targetId) ? distancesTo(graph, targetId) : null;
  const layout = layoutTree(tree);
  const ahead = direction === "ahead";

  const xOf = (column: number) => PAD + (ahead ? column : layout.columns - 1 - column) * COL_W;
  const yOf = (row: number) => PAD + row * ROW_H;
  const positions = new Map(layout.nodes.map((p) => [p.node, { x: xOf(p.column), y: yOf(p.row) }]));

  const nodes: SceneNode[] = layout.nodes.map(({ node }, i) => {
    const { x, y } = positions.get(node)!;
    const steps = dist?.get(node.songId);
    const badge: Badge | null =
      steps === undefined ? null : steps === 0 ? { kind: "target" } : { kind: "distance", steps };
    return {
      key: `n${i}`,
      songId: node.songId,
      x,
      y,
      isRoot: node.depth === 0,
      loop: node.loop,
      dim: node.passed || (dist !== null && steps === undefined),
      badge,
    };
  });

  const edges: SceneEdge[] = [];
  for (const { node: parent } of layout.nodes) {
    for (const child of parent.children) {
      const via = child.via!;
      // Arrows always run in playing order, whichever way the tree was unrolled.
      const [earlier, later] = ahead ? [parent, child] : [child, parent];
      const a = positions.get(earlier)!;
      const b = positions.get(later)!;
      const x1 = a.x + NODE_W;
      const y1 = a.y + NODE_H / 2;
      const x2 = b.x;
      const y2 = b.y + NODE_H / 2;
      const mx = (x1 + x2) / 2;

      const dFrom = dist?.get(via.from);
      const dTo = dist?.get(via.to);
      const onRoute = dFrom !== undefined && dTo !== undefined && dTo === dFrom - 1;

      edges.push({
        key: `e${edges.length}`,
        from: via.from,
        to: via.to,
        path: `M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2 - 2},${y2}`,
        labelX: mx,
        labelY: (y1 + y2) / 2,
        label: edgeLabel(graph, via.from, via.to, via.cueSec),
        tone: child.passed ? "danger" : onRoute ? "accent" : "line",
      });
    }
  }

  return {
    width: layout.columns * COL_W - (COL_W - NODE_W) + PAD * 2,
    height: Math.max(1, layout.rows) * ROW_H + PAD * 2,
    nodes,
    edges,
    nodeCount,
    truncated,
    reachableCount: dist ? dist.size - 1 : null,
    passedCount: ahead
      ? graph.out(rootId).filter((t) => t.cueSec !== null && t.cueSec < positionSec).length
      : 0,
  };
}

function edgeLabel(graph: TransitionGraph, fromId: string, toId: string, cueSec: number | null): string {
  const bits: string[] = [];
  if (cueSec !== null) bits.push(`@${formatTime(cueSec)}`);
  const a = graph.songs.get(fromId)?.bpm;
  const b = graph.songs.get(toId)?.bpm;
  if (a && b) {
    const delta = b - a;
    bits.push(`${delta > 0 ? "+" : ""}${delta} BPM`);
  }
  return bits.join("  ");
}

/**
 * Chip color for a Camelot key: hue walks the wheel, minor (A) keys are deeper and
 * major (B) keys lighter. Null for unknown keys so the UI can use a neutral color.
 */
export function keyColor(key: string): string | null {
  const m = /^(\d{1,2})([AB])$/i.exec(key);
  if (!m) return null;
  const hue = (Number(m[1]) * 30 + 150) % 360;
  return m[2]!.toUpperCase() === "A" ? `hsl(${hue} 62% 58%)` : `hsl(${hue} 78% 74%)`;
}
