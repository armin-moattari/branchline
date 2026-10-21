import type { TreeNode } from "./types";

export interface PositionedNode {
  node: TreeNode;
  /** Column index (0 = root). */
  column: number;
  /** Row position; may be fractional for parents centered between children. */
  row: number;
}

export interface TreeLayout {
  nodes: PositionedNode[];
  /** Number of leaf rows, i.e. the tree's height in rows. */
  rows: number;
  /** Number of columns, i.e. maxDepth + 1. */
  columns: number;
}

/**
 * Simple tidy layout: leaves take consecutive rows in DFS order, and every parent
 * sits at the midpoint of its first and last child. Columns are the node depth.
 *
 * Pure geometry in grid units, so the UI decides pixel sizes and the direction
 * (mirror columns for "look toward").
 */
export function layoutTree(root: TreeNode): TreeLayout {
  const nodes: PositionedNode[] = [];
  let nextLeafRow = 0;
  let maxDepth = 0;

  const walk = (node: TreeNode): number => {
    maxDepth = Math.max(maxDepth, node.depth);
    let row: number;
    if (node.children.length === 0) {
      row = nextLeafRow++;
    } else {
      const childRows = node.children.map(walk);
      row = (childRows[0]! + childRows[childRows.length - 1]!) / 2;
    }
    nodes.push({ node, column: node.depth, row });
    return row;
  };

  walk(root);
  return { nodes, rows: nextLeafRow, columns: maxDepth + 1 };
}
