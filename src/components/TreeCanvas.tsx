"use client";

import { useId } from "react";
import type { Song } from "@/graph";
import { SIZES, type EdgeTone, type Scene } from "@/library";
import { KeyChip } from "./ui";

const TONES: EdgeTone[] = ["line", "accent", "danger"];

interface TreeCanvasProps {
  scene: Scene | null;
  songs: ReadonlyMap<string, Song>;
  onPick: (songId: string) => void;
}

export function TreeCanvas({ scene, songs, onPick }: TreeCanvasProps) {
  const markerId = useId();

  return (
    <div className="relative min-h-[380px] overflow-auto rounded-2xl border border-line bg-panel max-lg:max-h-[70vh] lg:max-h-[calc(100vh-290px)]">
      {!scene ? (
        <p className="max-w-[52ch] px-6 py-10 text-muted">Add a song to start your graph.</p>
      ) : (
        <div className="relative" style={{ width: scene.width, height: scene.height }}>
          <svg
            width={scene.width}
            height={scene.height}
            viewBox={`0 0 ${scene.width} ${scene.height}`}
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
          >
            <defs>
              {TONES.map((tone) => (
                <marker
                  key={tone}
                  id={`${markerId}-${tone}`}
                  viewBox="0 0 10 10"
                  refX={9}
                  refY={5}
                  markerWidth={7}
                  markerHeight={7}
                  orient="auto-start-reverse"
                >
                  <path d="M0,0 L10,5 L0,10 z" style={{ fill: `var(--${tone})` }} />
                </marker>
              ))}
            </defs>
            {scene.edges.map((e) => (
              <path
                key={e.key}
                d={e.path}
                fill="none"
                style={{ stroke: `var(--${e.tone})` }}
                strokeWidth={e.tone === "accent" ? 2.5 : 1.6}
                strokeDasharray={e.tone === "danger" ? "5 5" : undefined}
                markerEnd={`url(#${markerId}-${e.tone})`}
              />
            ))}
          </svg>

          {scene.edges.map(
            (e) =>
              e.label && (
                <div
                  key={e.key}
                  className={`pointer-events-none absolute -translate-1/2 rounded bg-panel px-1 text-[11px] whitespace-pre ${
                    e.tone === "danger" ? "text-danger" : "text-muted"
                  }`}
                  style={{ left: e.labelX, top: e.labelY }}
                >
                  {e.label}
                </div>
              ),
          )}

          {scene.nodes.map((n) => {
            const song = songs.get(n.songId);
            if (!song) return null;
            const place = { left: n.x, top: n.y, width: SIZES.NODE_W };
            const dim = n.dim ? "opacity-35" : "";

            if (n.loop) {
              return (
                <button
                  key={n.key}
                  type="button"
                  title="Already earlier in this path"
                  aria-label={`Loops back to ${song.title}. Start from here.`}
                  onClick={() => onPick(n.songId)}
                  className={`absolute mt-2.5 flex h-11 cursor-pointer items-center rounded-xl border border-dashed border-line px-2.5 text-left transition hover:border-accent ${dim}`}
                  style={place}
                >
                  <div className="min-w-0">
                    <div className="text-xs text-muted">loops back to</div>
                    <div className="truncate font-semibold">{song.title}</div>
                  </div>
                </button>
              );
            }

            return (
              <button
                key={n.key}
                type="button"
                aria-label={`${song.title} by ${song.artist}. Start from here.`}
                onClick={() => onPick(n.songId)}
                className={`absolute flex cursor-pointer items-center gap-2 rounded-xl bg-panel-2 px-2.5 py-2 text-left transition hover:border-accent ${
                  n.isRoot ? "border-2 border-accent" : "border border-line"
                } ${dim}`}
                style={{ ...place, height: SIZES.NODE_H }}
              >
                <KeyChip songKey={song.key} />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold">{song.title}</div>
                  <div className="truncate text-xs text-muted">
                    {song.artist}
                    {song.bpm ? ` · ${song.bpm}` : ""}
                  </div>
                </div>
                {n.badge && (
                  <span
                    className={`absolute -top-2.5 right-2 rounded-full px-2 text-[11px] font-bold text-chip ${
                      n.badge.kind === "target" ? "bg-accent" : "bg-accent-2"
                    }`}
                  >
                    {n.badge.kind === "target" ? "target" : `${n.badge.steps} to target`}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
