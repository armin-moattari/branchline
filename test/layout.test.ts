import { buildTree, layoutTree, TransitionGraph } from "../src/graph";
import { edge, song } from "./helpers";

describe("layoutTree", () => {
  const g = new TransitionGraph(
    ["r", "a", "b", "a1", "a2"].map((id) => song(id)),
    [edge("r", "a"), edge("r", "b"), edge("a", "a1"), edge("a", "a2")],
  );
  const { tree } = buildTree(g, "r", { direction: "ahead", maxDepth: 3 });
  const layout = layoutTree(tree!);
  const rowOf = (id: string) => layout.nodes.find((n) => n.node.songId === id)!.row;

  it("gives leaves consecutive rows in DFS order", () => {
    expect([rowOf("a1"), rowOf("a2"), rowOf("b")]).toEqual([0, 1, 2]);
  });

  it("centers each parent on its first and last child", () => {
    expect(rowOf("a")).toBe(0.5);
    expect(rowOf("r")).toBe(1.25);
  });

  it("reports grid size", () => {
    expect(layout.rows).toBe(3);
    expect(layout.columns).toBe(3);
  });

  it("uses depth as the column", () => {
    const col = (id: string) => layout.nodes.find((n) => n.node.songId === id)!.column;
    expect([col("r"), col("a"), col("a1")]).toEqual([0, 1, 2]);
  });
});
