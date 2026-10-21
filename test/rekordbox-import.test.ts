import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parseRekordboxXml } from "../src/import";
import { applyRekordboxImport } from "../src/library";
import type { Library } from "../src/library";
import { edge, song } from "./helpers";

const parsed = parseRekordboxXml(
  readFileSync(fileURLToPath(new URL("./fixtures/rekordbox-sample.xml", import.meta.url)), "utf8"),
);
// Playlist 0: Gigs/Saturday = Low Tide Radio → Copper Lights → Night Bus to Nowhere
// Playlist 1: Warmup        = Paper Moons → Low Tide Radio

let i = 0;
const id = () => `id${i++}`;
const empty: Library = { songs: [], transitions: [] };
const pairs = (lib: Library) => lib.transitions.map((t) => `${t.from}>${t.to}`);

describe("applyRekordboxImport", () => {
  it("adds the songs and back-to-back transitions of the chosen playlists", () => {
    const result = applyRekordboxImport(empty, parsed, [0, 1], id);
    expect(result.newSongs).toBe(4);
    expect(result.matchedSongs).toBe(0);
    expect(result.newTransitions).toBe(3);
    expect(pairs(result.library)).toEqual(["rb_1>rb_2", "rb_2>rb_3", "rb_4>rb_1"]);
    expect(result.library.songs[0]).toMatchObject({ title: "Low Tide Radio", bpm: 124, key: "8A" });
  });

  it("only adds songs that appear in a chosen playlist", () => {
    const result = applyRekordboxImport(empty, parsed, [1], id);
    expect(result.library.songs.map((s) => s.id).sort()).toEqual(["rb_1", "rb_4"]);
    expect(pairs(result.library)).toEqual(["rb_4>rb_1"]);
  });

  it("matches existing songs by title and artist, filling in only what is missing", () => {
    const library: Library = {
      songs: [
        song("mine1", { title: "low tide radio", artist: "MAREN VOS", bpm: null, key: "", lengthSec: null }),
        song("mine2", { title: "Copper Lights", artist: "", key: "10A", bpm: 999 }),
      ],
      transitions: [],
    };
    const result = applyRekordboxImport(library, parsed, [0], id);
    expect(result.matchedSongs).toBe(2);
    expect(result.newSongs).toBe(1);
    expect(pairs(result.library)).toEqual(["mine1>mine2", "mine2>rb_3"]);

    const [mine1, mine2] = result.library.songs;
    expect(mine1).toMatchObject({ title: "low tide radio", bpm: 124, key: "8A", lengthSec: 372, rating: 4 });
    expect(mine2).toMatchObject({ key: "10A", bpm: 999 });
  });

  it("does not match a song by the same title from a different artist", () => {
    const library: Library = { songs: [song("x", { title: "Low Tide Radio", artist: "Someone Else" })], transitions: [] };
    const result = applyRekordboxImport(library, parsed, [1], id);
    expect(result.matchedSongs).toBe(0);
    expect(result.newSongs).toBe(2);
  });

  it("skips transitions that are already saved", () => {
    const library: Library = {
      songs: [song("a", { title: "Low Tide Radio", artist: "Maren Vos" }), song("b", { title: "Copper Lights", artist: "Juno Estate" })],
      transitions: [edge("a", "b", 200)],
    };
    const result = applyRekordboxImport(library, parsed, [0], id);
    expect(result.newTransitions).toBe(1);
    expect(result.library.transitions[0]!.cueSec).toBe(200);
  });

  it("adds nothing when the same playlists are imported again", () => {
    const once = applyRekordboxImport(empty, parsed, [0, 1], id).library;
    const twice = applyRekordboxImport(once, parsed, [0, 1], id);
    expect(twice).toMatchObject({ newSongs: 0, newTransitions: 0, matchedSongs: 4 });
    expect(twice.library.songs).toHaveLength(4);
  });

  it("gives an imported song a fresh id when its Rekordbox id is taken by a different song", () => {
    const library: Library = { songs: [song("rb_1", { title: "Something Else" })], transitions: [] };
    const result = applyRekordboxImport(library, parsed, [1], id);
    const ids = result.library.songs.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(result.library.songs.find((s) => s.title === "Low Tide Radio")!.id).not.toBe("rb_1");
  });

  it("ignores playlist indexes that don't exist", () => {
    expect(applyRekordboxImport(empty, parsed, [7, -1], id)).toMatchObject({ newSongs: 0, newTransitions: 0 });
  });
});
