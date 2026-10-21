import type { Song, Transition } from "../graph/types";
import type { Library } from "./types";

/** Fictional starter library, the same one the prototype ships with. */
export function demoLibrary(): Library {
  const s = (id: string, title: string, artist: string, bpm: number, key: string, lengthSec: number): Song => ({
    id,
    title,
    artist,
    bpm,
    key,
    lengthSec,
    rating: null,
  });
  const songs = [
    s("s1", "Low Tide Radio", "Maren Vos", 124, "8A", 372),
    s("s2", "Copper Lights", "Juno Estate", 125, "9A", 345),
    s("s3", "Night Bus to Nowhere", "Kalt", 126, "8B", 410),
    s("s4", "Pressure Garden", "Ossie Bloom", 124, "7A", 388),
    s("s5", "Saltwater Static", "Tamsin Ray", 128, "9B", 400),
    s("s6", "Glass Pavilion", "Hollow Coast", 122, "6A", 420),
    s("s7", "Runway Lights", "DJ Perenne", 126, "10A", 330),
    s("s8", "Faultline", "Nnamdi Vale", 128, "10B", 395),
    s("s9", "Summer Ledger", "Ilse & Rowe", 123, "8A", 360),
    s("s10", "Afterglow Protocol", "Kalt", 130, "11A", 380),
    s("s11", "Paper Moons", "Maren Vos", 120, "5A", 350),
  ];

  const pairs: [string, string, number][] = [
    ["s1", "s2", 250], ["s1", "s4", 230], ["s1", "s9", 150], ["s2", "s3", 280],
    ["s2", "s7", 260], ["s3", "s8", 300], ["s3", "s5", 320], ["s4", "s6", 290],
    ["s4", "s9", 270], ["s6", "s11", 330], ["s9", "s2", 240], ["s7", "s8", 250],
    ["s7", "s5", 240], ["s5", "s10", 310], ["s8", "s10", 300], ["s11", "s1", 270],
  ];
  const transitions: Transition[] = pairs.map(([from, to, cueSec]) => ({ id: `t-${from}-${to}`, from, to, cueSec }));

  return { songs, transitions };
}
