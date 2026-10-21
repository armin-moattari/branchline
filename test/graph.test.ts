import { buildTree, distancesTo, shortestPath, TransitionGraph } from "../src/graph";
import type { TreeNode } from "../src/graph";
import { edge, song } from "./helpers";

// a → b → c → d
//  ↘ e ↗      ↑
//      f ─────┘   (f only reaches d; g is isolated)
const songs = ["a", "b", "c", "d", "e", "f", "g"].map((id) => song(id));
const transitions = [
  edge("a", "b", 200),
  edge("a", "e", 100),
  edge("b", "c"),
  edge("e", "c"),
  edge("c", "d"),
  edge("f", "d"),
];
const graph = new TransitionGraph(songs, transitions);

const ids = (n: TreeNode) => n.children.map((c) => c.songId);

describe("TransitionGraph", () => {
  it("indexes edges in both directions", () => {
    expect(graph.out("a").map((e) => e.to)).toEqual(["b", "e"]);
    expect(graph.in("c").map((e) => e.from)).toEqual(["b", "e"]);
    expect(graph.out("g")).toEqual([]);
  });

  it("ignores edges that reference unknown songs", () => {
    const g = new TransitionGraph([song("a")], [edge("a", "ghost")]);
    expect(g.out("a")).toEqual([]);
  });
});

describe("distancesTo", () => {
  it("labels every song with its fewest transitions to the target", () => {
    const dist = distancesTo(graph, "d");
    expect(Object.fromEntries(dist)).toEqual({ d: 0, c: 1, f: 1, b: 2, e: 2, a: 3 });
  });

  it("leaves out songs that cannot reach the target", () => {
    expect(distancesTo(graph, "d").has("g")).toBe(false);
  });

  it("returns an empty map for an unknown target", () => {
    expect(distancesTo(graph, "nope").size).toBe(0);
  });

  it("terminates on cycles", () => {
    const g = new TransitionGraph([song("x"), song("y")], [edge("x", "y"), edge("y", "x")]);
    expect(Object.fromEntries(distancesTo(g, "x"))).toEqual({ x: 0, y: 1 });
  });
});

describe("shortestPath", () => {
  it("follows one step closer each time", () => {
    expect(shortestPath(graph, "a", "d")).toEqual(["a", "b", "c", "d"]);
  });

  it("returns null when there is no route", () => {
    expect(shortestPath(graph, "g", "d")).toBeNull();
  });

  it("returns a single-song path when already at the target", () => {
    expect(shortestPath(graph, "d", "d")).toEqual(["d"]);
  });
});

describe("buildTree", () => {
  it("looks ahead along outgoing edges up to maxDepth", () => {
    const { tree } = buildTree(graph, "a", { direction: "ahead", maxDepth: 2 });
    expect(ids(tree!)).toEqual(["b", "e"]);
    expect(ids(tree!.children[0]!)).toEqual(["c"]);
    expect(tree!.children[0]!.children[0]!.children).toEqual([]); // depth cap
  });

  it("looks toward along incoming edges", () => {
    const { tree } = buildTree(graph, "d", { direction: "toward", maxDepth: 1 });
    expect(ids(tree!)).toEqual(["c", "f"]);
  });

  it("lets the same song appear in different branches", () => {
    const { tree } = buildTree(graph, "a", { direction: "ahead", maxDepth: 3 });
    const viaB = tree!.children[0]!.children[0]!;
    const viaE = tree!.children[1]!.children[0]!;
    expect(viaB.songId).toBe("c");
    expect(viaE.songId).toBe("c");
  });

  it("turns a song already on the path into an unexpanded loop leaf", () => {
    const g = new TransitionGraph([song("x"), song("y")], [edge("x", "y"), edge("y", "x")]);
    const { tree } = buildTree(g, "x", { direction: "ahead", maxDepth: 5 });
    const back = tree!.children[0]!.children[0]!;
    expect(back.songId).toBe("x");
    expect(back.loop).toBe(true);
    expect(back.children).toEqual([]);
  });

  it("marks root transitions whose cue point has passed, and their subtrees", () => {
    const { tree } = buildTree(graph, "a", { direction: "ahead", maxDepth: 3, positionSec: 150 });
    const [toB, toE] = tree!.children;
    expect(toB!.passed).toBe(false); // cue at 200, still ahead
    expect(toE!.passed).toBe(true); // cue at 100, already passed
    expect(toE!.children[0]!.passed).toBe(true);
  });

  it("never marks branches as passed in look-toward mode", () => {
    const { tree } = buildTree(graph, "b", { direction: "toward", maxDepth: 1, positionSec: 999 });
    expect(tree!.children.every((c) => !c.passed)).toBe(true);
  });

  it("stops at the node limit and reports truncation", () => {
    const many = Array.from({ length: 20 }, (_, i) => song(`s${i}`));
    const fan = many.slice(1).map((s) => edge("s0", s.id));
    const g = new TransitionGraph(many, fan);
    const result = buildTree(g, "s0", { direction: "ahead", maxDepth: 1, nodeLimit: 5 });
    expect(result.truncated).toBe(true);
    expect(result.nodeCount).toBe(5);
  });

  it("returns null for an unknown root", () => {
    expect(buildTree(graph, "nope", { direction: "ahead", maxDepth: 2 }).tree).toBeNull();
  });
});
