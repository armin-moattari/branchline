/**
 * Normalize a musical key to Camelot notation ("8A", "11B").
 *
 * Rekordbox writes `Tonality` in whatever notation the user picked, so this accepts:
 *  - Camelot: "8A", "08a"
 *  - Classic: "Am", "A minor", "F#", "Gbm", "C major"
 * Returns "" for anything it can't read.
 */

// Index = pitch class (C = 0). Values are Camelot numbers.
const MAJOR = [8, 3, 10, 5, 12, 7, 2, 9, 4, 11, 6, 1];
const MINOR = [5, 12, 7, 2, 9, 4, 11, 6, 1, 8, 3, 10];

const NOTE_TO_PC: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

export function toCamelot(raw: string | null | undefined): string {
  const input = (raw ?? "").trim();
  if (!input) return "";

  const camelot = /^0?(\d{1,2})\s*([AB])$/i.exec(input);
  if (camelot) {
    const n = Number(camelot[1]);
    return n >= 1 && n <= 12 ? `${n}${camelot[2]!.toUpperCase()}` : "";
  }

  const classic = /^([A-G])\s*([#♯b♭]?)\s*(m|min|minor|maj|major)?$/i.exec(input);
  if (!classic) return "";
  const letter = classic[1]!.toUpperCase();
  const accidental = classic[2] ?? "";
  const quality = (classic[3] ?? "").toLowerCase();

  let pc = NOTE_TO_PC[letter]!;
  if (accidental === "#" || accidental === "♯") pc += 1;
  if (accidental === "b" || accidental === "♭") pc -= 1;
  pc = (pc + 12) % 12;

  const isMinor = quality === "m" || quality === "min" || quality === "minor";
  return isMinor ? `${MINOR[pc]}A` : `${MAJOR[pc]}B`;
}
