"use client";

import { useMemo, useState, type ChangeEvent } from "react";
import { parseRekordboxXml, type RekordboxImport as ParsedExport } from "@/import";
import { applyRekordboxImport, type Library } from "@/library";
import { Button, inputClass } from "./ui";

interface RekordboxImportProps {
  library: Library;
  /** Import the chosen playlists; returns the message to show. */
  onImport: (parsed: ParsedExport, playlistIndexes: number[]) => string;
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

/**
 * Pick a Rekordbox XML export, choose playlists, import them as transitions.
 * The file is parsed here in the browser and never uploaded.
 */
export function RekordboxImport({ library, onImport }: RekordboxImportProps) {
  const [parsed, setParsed] = useState<ParsedExport | null>(null);
  const [fileName, setFileName] = useState("");
  const [selected, setSelected] = useState<ReadonlySet<number>>(new Set());
  const [filter, setFilter] = useState("");
  const [message, setMessage] = useState("");

  async function pickFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // so picking the same file again still fires
    if (!file) return;
    setParsed(null);
    setSelected(new Set());
    setFilter("");
    try {
      const result = parseRekordboxXml(await file.text());
      setParsed(result);
      setFileName(file.name);
      setMessage(
        result.playlists.length === 0
          ? "No playlists found in this file."
          : `Found ${plural(result.playlists.length, "playlist")} and ${plural(result.songs.length, "track")}.`,
      );
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Couldn't read that file.");
    }
  }

  const preview = useMemo(
    () => (parsed && selected.size > 0 ? applyRekordboxImport(library, parsed, [...selected]) : null),
    [library, parsed, selected],
  );

  const visible = useMemo(() => {
    if (!parsed) return [];
    const q = filter.trim().toLowerCase();
    return parsed.playlists
      .map((p, index) => ({ ...p, index, label: p.path.join(" / ") }))
      .filter((p) => !q || p.label.toLowerCase().includes(q));
  }, [parsed, filter]);

  const importable = visible.filter((p) => p.songIds.length >= 2);
  const allVisibleSelected = importable.length > 0 && importable.every((p) => selected.has(p.index));

  function toggle(index: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  function toggleAllVisible() {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const p of importable) {
        if (allVisibleSelected) next.delete(p.index);
        else next.add(p.index);
      }
      return next;
    });
  }

  function runImport() {
    if (!parsed || selected.size === 0) return;
    setMessage(onImport(parsed, [...selected]));
    setParsed(null);
    setSelected(new Set());
  }

  return (
    <section aria-labelledby="rb-heading" className="mb-3 border-b border-line pb-3.5">
      <h2 id="rb-heading" className="mb-1 font-display text-[15px] font-bold">
        From Rekordbox
      </h2>
      <p className="mb-2.5 text-[13px] text-muted">
        In Rekordbox, choose <b>File → Export Collection in xml format</b>, then pick that file here. Each playlist
        becomes transitions between back-to-back tracks. The file is read in your browser and never uploaded.
      </p>

      <label className="inline-block cursor-pointer rounded-lg border border-line px-3.5 py-2 font-semibold hover:border-accent focus-within:outline-2 focus-within:outline-accent">
        {parsed ? "Choose another file" : "Choose XML file"}
        <input type="file" accept=".xml,text/xml,application/xml" onChange={pickFile} className="sr-only" />
      </label>

      {parsed && parsed.playlists.length > 0 && (
        <div className="mt-3">
          <div className="mb-1.5 truncate text-[13px] text-muted" title={fileName}>
            {fileName}
          </div>
          {parsed.playlists.length > 6 && (
            <>
              <label htmlFor="rb-filter" className="sr-only">
                Filter playlists
              </label>
              <input
                id="rb-filter"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Filter playlists"
                className={`${inputClass} mb-2`}
              />
            </>
          )}
          <label className="mb-1 flex items-center gap-2 text-[13px] text-muted">
            <input
              type="checkbox"
              checked={allVisibleSelected}
              onChange={toggleAllVisible}
              disabled={importable.length === 0}
              className="accent-accent"
            />
            Select all{filter ? " shown" : ""}
          </label>
          <ul className="max-h-64 overflow-auto rounded-lg border border-line bg-panel-2">
            {visible.map((p) => {
              const tooShort = p.songIds.length < 2;
              return (
                <li key={p.index} className="border-b border-line last:border-b-0">
                  <label
                    className={`flex items-center gap-2 px-2.5 py-1.5 ${tooShort ? "opacity-50" : "cursor-pointer"}`}
                  >
                    <input
                      type="checkbox"
                      checked={selected.has(p.index)}
                      onChange={() => toggle(p.index)}
                      disabled={tooShort}
                      className="accent-accent"
                    />
                    <span className="min-w-0 flex-1 truncate" title={p.label}>
                      {p.label}
                    </span>
                    <span className="flex-none text-xs text-muted">{plural(p.songIds.length, "track")}</span>
                  </label>
                </li>
              );
            })}
            {visible.length === 0 && <li className="px-2.5 py-1.5 text-[13px] text-muted">No matches.</li>}
          </ul>

          {parsed.missingRefs > 0 && (
            <p className="mt-2 text-[13px] text-muted">
              {parsed.missingRefs === 1
                ? "1 playlist entry points at a track"
                : `${parsed.missingRefs} playlist entries point at tracks`}{" "}
              missing from the collection and will be skipped.
            </p>
          )}

          <p className="mt-2 text-[13px] text-muted" aria-live="polite">
            {preview
              ? `Adds ${plural(preview.newTransitions, "new transition")} and ${plural(preview.newSongs, "new song")}` +
                (preview.matchedSongs ? `; ${plural(preview.matchedSongs, "track")} already in your library.` : ".")
              : "Choose playlists to import."}
          </p>
          <Button type="button" onClick={runImport} disabled={!preview} className="mt-2 disabled:opacity-50">
            Import {selected.size > 0 ? plural(selected.size, "playlist") : "playlists"}
          </Button>
        </div>
      )}

      <p role="status" className="mt-2 text-[13px] text-muted">
        {message}
      </p>
    </section>
  );
}
