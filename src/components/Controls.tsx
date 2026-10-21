"use client";

import type { Song } from "@/graph";
import { formatTime, MAX_DEPTH, MIN_DEPTH, type ViewState } from "@/library";
import { inputClass, Label } from "./ui";

/** Slider range for songs whose length isn't known. */
export const DEFAULT_LENGTH_SEC = 420;

interface ControlsProps {
  songs: Song[];
  view: ViewState;
  rootLengthSec: number;
  onChange: (patch: Partial<ViewState>) => void;
}

export function Controls({ songs, view, rootLengthSec, onChange }: ControlsProps) {
  const options = songs.map((s) => (
    <option key={s.id} value={s.id}>
      {s.title} — {s.artist}
    </option>
  ));

  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] items-end gap-3 rounded-2xl border border-line bg-panel px-3.5 py-3">
      <div>
        <Label htmlFor="c-root">Start from</Label>
        <select
          id="c-root"
          value={view.rootId}
          onChange={(e) => onChange({ rootId: e.target.value, positionSec: 0 })}
          className={inputClass}
        >
          {options}
        </select>
      </div>

      <div>
        <Label>Direction</Label>
        <div role="group" aria-label="Direction" className="flex rounded-lg border border-line bg-panel-2 p-[3px]">
          {(["ahead", "toward"] as const).map((d) => (
            <button
              key={d}
              type="button"
              aria-pressed={view.direction === d}
              onClick={() => onChange({ direction: d })}
              className={`flex-1 cursor-pointer rounded-md px-2 py-1.5 font-semibold ${
                view.direction === d ? "bg-accent text-chip" : "text-muted"
              }`}
            >
              {d === "ahead" ? "Look ahead" : "Look toward"}
            </button>
          ))}
        </div>
      </div>

      <div>
        <Label htmlFor="c-depth">Depth: {view.depth}</Label>
        <input
          id="c-depth"
          type="range"
          min={MIN_DEPTH}
          max={MAX_DEPTH}
          value={view.depth}
          onChange={(e) => onChange({ depth: Number(e.target.value) })}
          className="h-8 w-full accent-accent"
        />
      </div>

      <div>
        <Label htmlFor="c-target">Pathfinder target</Label>
        <select
          id="c-target"
          value={view.targetId}
          onChange={(e) => onChange({ targetId: e.target.value })}
          className={inputClass}
        >
          <option value="">None</option>
          {options}
        </select>
      </div>

      {view.direction === "ahead" && (
        <div>
          <Label htmlFor="c-pos">Playing position: {formatTime(view.positionSec)}</Label>
          <input
            id="c-pos"
            type="range"
            min={0}
            max={rootLengthSec}
            step={5}
            value={Math.min(view.positionSec, rootLengthSec)}
            onChange={(e) => onChange({ positionSec: Number(e.target.value) })}
            className="h-8 w-full accent-accent"
          />
        </div>
      )}
    </div>
  );
}
