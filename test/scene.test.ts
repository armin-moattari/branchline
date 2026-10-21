import { TransitionGraph } from "../src/graph";
import { buildScene, keyColor, SIZES } from "../src/library";
import type { ViewState } from "../src/library";
import { edge, song } from "./helpers";

// a → b → c, a → d, c → a (cycle back to the root)
const songs = [
  song("a", { bpm: 120 }),
  song("b", { bpm: 124 }),
  song("c", { bpm: 122 }),
  song("d"),
];
const graph = new TransitionGraph(songs, [edge("a", "b", 250), edge("a", "d", 100), edge("b", "c"), edge("c", "a")]);

const view = (over: Partial<ViewState> = {}): ViewState => ({
  rootId: "a",
  direction: "ahead",
  depth: 3,
  targetId: "",
  positionSec: 0,
  ...over,
});

const { COL_W, ROW_H, NODE_W, NODE_H, PAD } = SIZES;

describe("buildScene", () => {
  it("returns null for an unknown root", () => {
    expect(buildScene(graph, view({ rootId: "ghost" }))).toBeNull();
  });

  it("places columns left to right when looking ahead", () => {
    const scene = buildScene(graph, view())!;
    const root = scene.nodes.find((n) => n.isRoot)!;
    expect(root.x).toBe(PAD);
    const c = scene.nodes.find((n) => n.songId === "c")!;
    expect(c.x).toBe(PAD + 2 * COL_W);
    expect(scene.width).toBe(4 * COL_W - (COL_W - NODE_W) + PAD * 2);
  });

  it("mirrors columns when looking toward", () => {
    const scene = buildScene(graph, view({ direction: "toward", depth: 2 }))!;
    const root = scene.nodes.find((n) => n.isRoot)!;
    expect(root.x).toBe(PAD + 2 * COL_W);
  });

  it("marks songs already on the path as loops", () => {
    const scene = buildScene(graph, view())!;
    const loop = scene.nodes.find((n) => n.loop)!;
    expect(loop.songId).toBe("a");
  });

  it("draws edges in playing order with cue and BPM labels", () => {
    const scene = buildScene(graph, view())!;
    const ab = scene.edges.find((e) => e.from === "a" && e.to === "b")!;
    expect(ab.label).toBe("@4:10  +4 BPM");
    expect(ab.path.startsWith(`M${PAD + NODE_W},`)).toBe(true);

    const toward = buildScene(graph, view({ rootId: "c", direction: "toward", depth: 1 }))!;
    const bc = toward.edges[0]!;
    expect([bc.from, bc.to]).toEqual(["b", "c"]);
    expect(bc.label).toBe("-2 BPM");
  });

  it("dims and colors branches whose cue point has passed", () => {
    const scene = buildScene(graph, view({ positionSec: 150 }))!;
    const ad = scene.edges.find((e) => e.to === "d")!;
    const ab = scene.edges.find((e) => e.to === "b")!;
    expect(ad.tone).toBe("danger");
    expect(ab.tone).toBe("line");
    expect(scene.nodes.find((n) => n.songId === "d")!.dim).toBe(true);
    expect(scene.passedCount).toBe(1);
  });

  it("highlights the route to the target and badges distances", () => {
    const scene = buildScene(graph, view({ targetId: "c" }))!;
    expect(scene.edges.filter((e) => e.tone === "accent").map((e) => `${e.from}${e.to}`).sort()).toEqual(["ab", "bc"]);
    expect(scene.nodes.find((n) => n.isRoot)!.badge).toEqual({ kind: "distance", steps: 2 });
    expect(scene.nodes.find((n) => n.songId === "c")!.badge).toEqual({ kind: "target" });
    expect(scene.nodes.find((n) => n.songId === "d")!.dim).toBe(true);
    expect(scene.reachableCount).toBe(2);
  });

  it("sizes the stage to the leaf rows", () => {
    const scene = buildScene(graph, view())!;
    expect(scene.height).toBe(2 * ROW_H + PAD * 2);
    expect(scene.nodes.every((n) => n.y >= PAD && n.y + NODE_H <= scene.height)).toBe(true);
  });
});

describe("keyColor", () => {
  it("gives minor and major keys distinct colors and falls back for unknown keys", () => {
    expect(keyColor("8A")).toBe("hsl(30 62% 58%)");
    expect(keyColor("8B")).toBe("hsl(30 78% 74%)");
    expect(keyColor("")).toBeNull();
  });
});
