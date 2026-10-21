import { XMLParser } from "fast-xml-parser";
import type { Song } from "../graph/types";
import { toCamelot } from "./camelot";

/**
 * Parser for Rekordbox's XML export (File → Export Collection in xml format).
 *
 * Shape, trimmed to what we read:
 *
 *   <DJ_PLAYLISTS>
 *     <COLLECTION Entries="N">
 *       <TRACK TrackID="1" Name="…" Artist="…" TotalTime="372"
 *              AverageBpm="124.00" Tonality="8A" Rating="204" Location="file://…"/>
 *     </COLLECTION>
 *     <PLAYLISTS>
 *       <NODE Type="0" Name="ROOT">                          ← folder
 *         <NODE Type="1" Name="Saturday" KeyType="0">       ← playlist
 *           <TRACK Key="1"/>                                ← KeyType 0: TrackID, 1: Location
 *         </NODE>
 *       </NODE>
 *     </PLAYLISTS>
 *   </DJ_PLAYLISTS>
 *
 * Pure function of the XML string, so it runs in the browser (file never uploaded)
 * or on a server.
 */

export interface RekordboxPlaylist {
  /** Folder path plus playlist name, e.g. ["Gigs", "Saturday"]. */
  path: string[];
  /** Song ids in played order. */
  songIds: string[];
}

export interface RekordboxImport {
  songs: Song[];
  playlists: RekordboxPlaylist[];
  /** Playlist entries that referenced a track not found in the collection. */
  missingRefs: number;
}

type Attrs = Record<string, string | undefined>;
type XmlNode = Attrs & {
  NODE?: XmlNode[];
  TRACK?: Attrs[];
};

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "",
  parseAttributeValue: false,
  isArray: (name) => name === "TRACK" || name === "NODE",
});

/** Rekordbox stores stars as 0, 51, 102, 153, 204, 255. */
export function ratingToStars(raw: string | undefined): number | null {
  if (raw === undefined || raw === "") return null;
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.min(5, Math.round(n / 51)));
}

function num(raw: string | undefined): number | null {
  if (raw === undefined || raw === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function parseRekordboxXml(xml: string): RekordboxImport {
  const doc = parser.parse(xml) as { DJ_PLAYLISTS?: { COLLECTION?: { TRACK?: Attrs[] }[] | { TRACK?: Attrs[] }; PLAYLISTS?: { NODE?: XmlNode[] } } };
  const root = doc.DJ_PLAYLISTS;
  if (!root) throw new Error("Not a Rekordbox XML export: missing <DJ_PLAYLISTS>.");

  const collection = Array.isArray(root.COLLECTION) ? root.COLLECTION[0] : root.COLLECTION;
  const tracks = collection?.TRACK ?? [];

  const songs: Song[] = [];
  const byTrackId = new Map<string, string>();
  const byLocation = new Map<string, string>();

  for (const t of tracks) {
    if (!t.TrackID) continue;
    const id = `rb_${t.TrackID}`;
    const bpm = num(t.AverageBpm);
    songs.push({
      id,
      title: t.Name?.trim() || "Untitled",
      artist: t.Artist?.trim() ?? "",
      bpm: bpm === null ? null : Math.round(bpm * 10) / 10,
      key: toCamelot(t.Tonality),
      lengthSec: num(t.TotalTime),
      rating: ratingToStars(t.Rating),
    });
    byTrackId.set(t.TrackID, id);
    if (t.Location) byLocation.set(t.Location, id);
  }

  const playlists: RekordboxPlaylist[] = [];
  let missingRefs = 0;

  const walk = (node: XmlNode, path: string[]) => {
    const name = node.Name ?? "";
    if (node.Type === "1") {
      const lookup = node.KeyType === "1" ? byLocation : byTrackId;
      const songIds: string[] = [];
      for (const entry of node.TRACK ?? []) {
        const id = entry.Key ? lookup.get(entry.Key) : undefined;
        if (id) songIds.push(id);
        else missingRefs++;
      }
      playlists.push({ path: [...path, name], songIds });
      return;
    }
    // Folder. The top-level folder is named "ROOT" and is left out of paths.
    const childPath = name === "ROOT" && path.length === 0 ? path : [...path, name];
    for (const child of node.NODE ?? []) walk(child, childPath);
  };

  for (const top of root.PLAYLISTS?.NODE ?? []) walk(top, []);

  return { songs, playlists, missingRefs };
}
