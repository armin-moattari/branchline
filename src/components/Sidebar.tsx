"use client";

import { useState, type FormEvent } from "react";
import type { Song, Transition } from "@/graph";
import { formatTime, parseTime, type NewSong } from "@/library";
import { Button, DeleteButton, inputClass, KeyChip, Label } from "./ui";

const TABS = [
  { id: "songs", label: "Songs" },
  { id: "transitions", label: "Transitions" },
  { id: "import", label: "Import" },
] as const;
type TabId = (typeof TABS)[number]["id"];

export interface SidebarProps {
  /** Sorted by title, for lists and pickers. */
  songs: Song[];
  transitions: Transition[];
  onAddSong: (song: NewSong) => void;
  onRemoveSong: (id: string) => void;
  onStartFrom: (id: string) => void;
  onSaveTransition: (t: Omit<Transition, "id">) => void;
  onRemoveTransition: (id: string) => void;
  /** Returns the message to show, e.g. how many transitions were added. */
  onImport: (text: string) => string;
  /** Returns false if the user cancelled. */
  onResetDemo: () => boolean;
}

export function Sidebar(props: SidebarProps) {
  const [tab, setTab] = useState<TabId>("songs");

  return (
    <aside className="flex min-h-0 flex-col rounded-2xl border border-line bg-panel lg:max-h-[calc(100vh-110px)]">
      <div role="tablist" aria-label="Library" className="flex border-b border-line">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            id={`tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls={`pane-${t.id}`}
            onClick={() => setTab(t.id)}
            className={`flex-1 cursor-pointer border-b-2 px-2 py-3 font-semibold ${
              tab === t.id ? "border-accent text-text" : "border-transparent text-muted"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`pane-${tab}`} aria-labelledby={`tab-${tab}`} className="overflow-auto p-3.5">
        {tab === "songs" && <SongsPane {...props} />}
        {tab === "transitions" && <TransitionsPane {...props} />}
        {tab === "import" && <ImportPane {...props} />}
      </div>
    </aside>
  );
}

const listItem = "flex items-center gap-2.5 border-b border-line py-2 last:border-b-0";
const formClass = "mb-3 border-b border-line pb-3.5";

function SongsPane({ songs, onAddSong, onRemoveSong, onStartFrom }: SidebarProps) {
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const text = (name: string) => String(data.get(name) ?? "");
    const bpm = Number(text("bpm"));
    onAddSong({
      title: text("title"),
      artist: text("artist"),
      bpm: bpm > 0 ? bpm : null,
      key: text("key"),
      lengthSec: parseTime(text("length")),
    });
    form.reset();
  }

  return (
    <>
      <form onSubmit={submit} className={formClass}>
        <div className="mb-2">
          <Label htmlFor="song-title">Title</Label>
          <input id="song-title" name="title" required className={inputClass} />
        </div>
        <div className="mb-2">
          <Label htmlFor="song-artist">Artist</Label>
          <input id="song-artist" name="artist" className={inputClass} />
        </div>
        <div className="mb-2 grid grid-cols-3 gap-2">
          <div>
            <Label htmlFor="song-bpm">BPM</Label>
            <input id="song-bpm" name="bpm" type="number" min={40} max={220} className={inputClass} />
          </div>
          <div>
            <Label htmlFor="song-key">Key</Label>
            <input id="song-key" name="key" placeholder="8A or Am" className={inputClass} />
          </div>
          <div>
            <Label htmlFor="song-length">Length</Label>
            <input id="song-length" name="length" placeholder="6:00" className={inputClass} />
          </div>
        </div>
        <Button type="submit">Add song</Button>
      </form>

      <ul>
        {songs.map((s) => (
          <li key={s.id} className={listItem}>
            <KeyChip songKey={s.key} />
            <div className="min-w-0 flex-1">
              <div className="truncate font-semibold">{s.title}</div>
              <div className="truncate text-[13px] text-muted">
                {s.artist}
                {s.bpm ? ` · ${s.bpm} BPM` : ""}
              </div>
            </div>
            <Button variant="ghost" size="sm" type="button" onClick={() => onStartFrom(s.id)}>
              Start here
            </Button>
            <DeleteButton label={`Delete ${s.title}`} onClick={() => onRemoveSong(s.id)} />
          </li>
        ))}
        {songs.length === 0 && <li className="py-2 text-[13px] text-muted">No songs yet. Add one above.</li>}
      </ul>
    </>
  );
}

function TransitionsPane({ songs, transitions, onSaveTransition, onRemoveTransition }: SidebarProps) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [cue, setCue] = useState("");
  const byId = new Map(songs.map((s) => [s.id, s]));
  // Fall back to the first songs when nothing (or a deleted song) is selected.
  const fromId = byId.has(from) ? from : (songs[0]?.id ?? "");
  const toId = byId.has(to) ? to : (songs[1]?.id ?? fromId);

  function submit(e: FormEvent) {
    e.preventDefault();
    onSaveTransition({ from: fromId, to: toId, cueSec: parseTime(cue) });
    setCue("");
  }

  const options = songs.map((s) => (
    <option key={s.id} value={s.id}>
      {s.title} — {s.artist}
    </option>
  ));

  return (
    <>
      <form onSubmit={submit} className={formClass}>
        <div className="mb-2">
          <Label htmlFor="t-from">From</Label>
          <select id="t-from" value={fromId} onChange={(e) => setFrom(e.target.value)} className={inputClass}>
            {options}
          </select>
        </div>
        <div className="mb-2">
          <Label htmlFor="t-to">Into</Label>
          <select id="t-to" value={toId} onChange={(e) => setTo(e.target.value)} className={inputClass}>
            {options}
          </select>
        </div>
        <div className="mb-2">
          <Label htmlFor="t-cue">Mix starts at (in the first track)</Label>
          <input
            id="t-cue"
            value={cue}
            onChange={(e) => setCue(e.target.value)}
            placeholder="4:10, optional"
            className={inputClass}
          />
        </div>
        {fromId === toId && songs.length > 0 && (
          <p className="mb-2 text-[13px] text-muted">Pick two different songs.</p>
        )}
        <Button type="submit" disabled={!fromId || fromId === toId} className="disabled:opacity-50">
          Save transition
        </Button>
      </form>

      <ul>
        {transitions.map((t) => {
          const a = byId.get(t.from);
          const b = byId.get(t.to);
          if (!a || !b) return null;
          return (
            <li key={t.id} className={listItem}>
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold">
                  {a.title} → {b.title}
                </div>
                <div className="truncate text-[13px] text-muted">
                  {t.cueSec !== null ? `mix at ${formatTime(t.cueSec)} · ` : ""}
                  {a.key || "?"} → {b.key || "?"}
                </div>
              </div>
              <DeleteButton label={`Delete ${a.title} → ${b.title}`} onClick={() => onRemoveTransition(t.id)} />
            </li>
          );
        })}
        {transitions.length === 0 && <li className="py-2 text-[13px] text-muted">No transitions yet.</li>}
      </ul>
    </>
  );
}

function ImportPane({ onImport, onResetDemo }: SidebarProps) {
  const [text, setText] = useState("");
  const [message, setMessage] = useState("");

  function runImport() {
    const lines = text.split("\n").filter((l) => l.trim());
    if (lines.length < 2) {
      setMessage("Paste at least two tracks, one per line.");
      return;
    }
    setMessage(onImport(text));
    setText("");
  }

  return (
    <>
      <p className="mb-3 text-[13px] text-muted">
        Paste a played set, one track per line, in order. Each back-to-back pair becomes a transition. Lines like{" "}
        <b>Artist - Title</b> or just <b>Title</b> both work; unknown tracks are added to your songs.
      </p>
      <label htmlFor="import-text" className="sr-only">
        Played set
      </label>
      <textarea
        id="import-text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={"Maren Vos - Low Tide Radio\nJuno Estate - Copper Lights\nKalt - Night Bus to Nowhere"}
        className={`${inputClass} min-h-44 resize-y`}
      />
      <div className="mt-2.5 flex flex-wrap gap-2">
        <Button type="button" onClick={runImport}>
          Import transitions
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            if (onResetDemo()) setMessage("Demo data restored.");
          }}
        >
          Reset to demo data
        </Button>
      </div>
      <p role="status" className="mt-2 text-[13px] text-muted">
        {message}
      </p>
    </>
  );
}
