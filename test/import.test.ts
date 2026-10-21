import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parseRekordboxXml, ratingToStars, toCamelot, transitionsFromSet } from "../src/import";
import { edge } from "./helpers";

const fixture = readFileSync(fileURLToPath(new URL("./fixtures/rekordbox-sample.xml", import.meta.url)), "utf8");

describe("transitionsFromSet", () => {
  let i = 0;
  const id = () => `n${i++}`;

  it("makes one transition per back-to-back pair", () => {
    const out = transitionsFromSet(["a", "b", "c"], [], id);
    expect(out.map((t) => [t.from, t.to])).toEqual([["a", "b"], ["b", "c"]]);
  });

  it("skips pairs that already exist and repeated tracks", () => {
    const out = transitionsFromSet(["a", "b", "b", "c", "a", "b"], [edge("b", "c")], id);
    expect(out.map((t) => [t.from, t.to])).toEqual([["a", "b"], ["c", "a"]]);
  });

  it("returns nothing for a set shorter than two songs", () => {
    expect(transitionsFromSet(["a"], [], id)).toEqual([]);
  });
});

describe("toCamelot", () => {
  it.each([
    ["8A", "8A"], ["08a", "8A"], ["12B", "12B"],
    ["Am", "8A"], ["A minor", "8A"], ["C", "8B"], ["C major", "8B"],
    ["F#m", "11A"], ["Gbm", "11A"], ["Ebm", "2A"], ["Bb", "6B"], ["E", "12B"],
  ])("%s → %s", (input, expected) => {
    expect(toCamelot(input)).toBe(expected);
  });

  it.each(["", "13A", "H", "banana"])("rejects %j", (input) => {
    expect(toCamelot(input)).toBe("");
  });
});

describe("ratingToStars", () => {
  it("maps Rekordbox's 0–255 scale to stars", () => {
    expect([0, 51, 102, 153, 204, 255].map((r) => ratingToStars(String(r)))).toEqual([0, 1, 2, 3, 4, 5]);
    expect(ratingToStars(undefined)).toBeNull();
  });
});

describe("parseRekordboxXml", () => {
  const result = parseRekordboxXml(fixture);

  it("reads the collection into songs", () => {
    expect(result.songs).toHaveLength(4);
    expect(result.songs[0]).toEqual({
      id: "rb_1", title: "Low Tide Radio", artist: "Maren Vos",
      bpm: 124, key: "8A", lengthSec: 372, rating: 4,
    });
  });

  it("normalizes classic key notation", () => {
    expect(result.songs.find((s) => s.id === "rb_3")!.key).toBe("8B"); // "C"
  });

  it("finds playlists inside folders, keeping their path", () => {
    expect(result.playlists.map((p) => p.path)).toEqual([["Gigs", "Saturday"], ["Warmup"]]);
  });

  it("resolves TrackID keys and Location keys", () => {
    expect(result.playlists[0]!.songIds).toEqual(["rb_1", "rb_2", "rb_3"]);
    expect(result.playlists[1]!.songIds).toEqual(["rb_4", "rb_1"]);
  });

  it("counts playlist entries that point at missing tracks", () => {
    expect(result.missingRefs).toBe(1);
  });

  it("rejects files that are not Rekordbox exports", () => {
    expect(() => parseRekordboxXml("<foo/>")).toThrow(/DJ_PLAYLISTS/);
  });
});
