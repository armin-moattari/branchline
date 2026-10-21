import {
  addSong,
  demoLibrary,
  formatTime,
  importPastedSet,
  parsePastedSet,
  parseStoredState,
  parseTime,
  removeSong,
  removeTransition,
  saveTransition,
  serializeState,
} from "../src/library";
import type { Library } from "../src/library";
import { edge, song } from "./helpers";

let i = 0;
const id = () => `id${i++}`;

const lib = (): Library => ({
  songs: [song("a", { title: "Alpha", artist: "Ann" }), song("b", { title: "Beta" }), song("c")],
  transitions: [edge("a", "b", 200), edge("b", "c")],
});

describe("parseTime / formatTime", () => {
  it.each([
    ["4:10", 250],
    ["0:05", 5],
    ["90", 90],
    [" 6:00 ", 360],
    ["", null],
    ["soon", null],
    ["4:75", null],
  ])("parseTime(%j) = %j", (input, expected) => {
    expect(parseTime(input)).toBe(expected);
  });

  it("formats seconds as m:ss", () => {
    expect(formatTime(250)).toBe("4:10");
    expect(formatTime(5)).toBe("0:05");
    expect(formatTime(null)).toBe("");
  });
});

describe("addSong", () => {
  it("adds a song with a normalized Camelot key", () => {
    const next = addSong(lib(), { title: " Gamma ", artist: "Gia", bpm: 124, key: "Am", lengthSec: 300 }, id);
    expect(next.songs.at(-1)).toMatchObject({ title: "Gamma", artist: "Gia", bpm: 124, key: "8A", lengthSec: 300 });
  });

  it("ignores a blank title", () => {
    const before = lib();
    expect(addSong(before, { title: "  ", artist: "", bpm: null, key: "", lengthSec: null }, id)).toBe(before);
  });
});

describe("removeSong", () => {
  it("removes the song and every transition touching it", () => {
    const next = removeSong(lib(), "b");
    expect(next.songs.map((s) => s.id)).toEqual(["a", "c"]);
    expect(next.transitions).toEqual([]);
  });
});

describe("saveTransition", () => {
  it("adds a new transition", () => {
    const next = saveTransition(lib(), { from: "c", to: "a", cueSec: 120 }, id);
    expect(next.transitions.at(-1)).toMatchObject({ from: "c", to: "a", cueSec: 120 });
  });

  it("updates the cue of an existing pair instead of duplicating it", () => {
    const next = saveTransition(lib(), { from: "a", to: "b", cueSec: 90 }, id);
    expect(next.transitions).toHaveLength(2);
    expect(next.transitions[0]!.cueSec).toBe(90);
  });

  it("keeps the old cue when the new one is empty", () => {
    const next = saveTransition(lib(), { from: "a", to: "b", cueSec: null }, id);
    expect(next.transitions[0]!.cueSec).toBe(200);
  });

  it("rejects self-loops and unknown songs", () => {
    const before = lib();
    expect(saveTransition(before, { from: "a", to: "a", cueSec: null }, id)).toBe(before);
    expect(saveTransition(before, { from: "a", to: "ghost", cueSec: null }, id)).toBe(before);
  });
});

describe("removeTransition", () => {
  it("removes by id", () => {
    const before = lib();
    const next = removeTransition(before, before.transitions[0]!.id);
    expect(next.transitions.map((t) => [t.from, t.to])).toEqual([["b", "c"]]);
  });
});

describe("parsePastedSet", () => {
  it("reads 'Artist - Title' and bare titles, skipping blank lines", () => {
    expect(parsePastedSet("Ann - Alpha\n\n  Beta  \nX - Y - Z")).toEqual([
      { artist: "Ann", title: "Alpha" },
      { artist: "", title: "Beta" },
      { artist: "X", title: "Y - Z" },
    ]);
  });
});

describe("importPastedSet", () => {
  it("matches existing songs, adds unknown ones, and links back-to-back pairs", () => {
    const result = importPastedSet(lib(), "ann - ALPHA\nNew Tune\nBeta", id);
    expect(result.newSongs).toBe(1);
    expect(result.newTransitions).toBe(2);
    const added = result.library.songs.find((s) => s.title === "New Tune")!;
    expect(result.library.transitions.slice(-2).map((t) => [t.from, t.to])).toEqual([
      ["a", added.id],
      [added.id, "b"],
    ]);
  });

  it("does not match a song whose artist differs", () => {
    const result = importPastedSet(lib(), "Someone Else - Alpha\nBeta", id);
    expect(result.newSongs).toBe(1);
  });

  it("skips pairs that already exist", () => {
    const result = importPastedSet(lib(), "Alpha\nBeta", id);
    expect(result.newTransitions).toBe(0);
    expect(result.library.transitions).toHaveLength(2);
  });
});

describe("demoLibrary", () => {
  it("only links songs that exist", () => {
    const demo = demoLibrary();
    const ids = new Set(demo.songs.map((s) => s.id));
    expect(demo.transitions.every((t) => ids.has(t.from) && ids.has(t.to))).toBe(true);
  });
});

describe("stored state", () => {
  it("round-trips", () => {
    const state = { library: lib(), view: { rootId: "a", direction: "toward" as const, depth: 4, targetId: "c", positionSec: 30 } };
    expect(parseStoredState(serializeState(state))).toEqual(state);
  });

  it.each([null, "", "not json", "{}", '{"library":{"songs":"x","transitions":[]}}'])(
    "returns null for unusable data %j",
    (raw) => {
      expect(parseStoredState(raw)).toBeNull();
    },
  );

  it("fills in a missing or invalid view", () => {
    const parsed = parseStoredState(JSON.stringify({ library: lib(), view: { depth: "deep" } }));
    expect(parsed?.view).toEqual({ rootId: "a", direction: "ahead", depth: 3, targetId: "", positionSec: 0 });
  });
});
