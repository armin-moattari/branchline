"use client";

import { useEffect, useMemo, useState } from "react";
import { TransitionGraph } from "@/graph";
import {
  addSong,
  applyRekordboxImport,
  buildScene,
  demoLibrary,
  importPastedSet,
  normalizeView,
  parseStoredState,
  removeSong,
  removeTransition,
  saveTransition,
  serializeState,
  STORAGE_KEY,
  type AppState,
  type Library,
  type ViewState,
} from "@/library";
import { Controls, DEFAULT_LENGTH_SEC } from "./Controls";
import { Sidebar } from "./Sidebar";
import { TreeCanvas } from "./TreeCanvas";
import { UnderTheHood } from "./UnderTheHood";

function importMessage(newTransitions: number, newSongs: number): string {
  const plural = (n: number, word: string) => `${n} new ${word}${n === 1 ? "" : "s"}`;
  return `Imported ${plural(newTransitions, "transition")} and ${plural(newSongs, "song")}.`;
}

function demoState(): AppState {
  const library = demoLibrary();
  return { library, view: normalizeView({}, library) };
}

/**
 * The whole planner. State lives here and is saved to localStorage until
 * accounts and Postgres arrive (roadmap step 4).
 */
export function Planner() {
  // Start from the demo so the server render and first client render match,
  // then swap in the saved state once we're in the browser.
  const [state, setState] = useState<AppState>(demoState);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const saved = parseStoredState(localStorage.getItem(STORAGE_KEY));
      if (saved) setState(saved);
    } catch {
      // Storage blocked (private mode, disabled cookies): keep the demo.
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(STORAGE_KEY, serializeState(state));
    } catch {
      // Nothing to do; the app still works for this session.
    }
  }, [state, loaded]);

  const { library } = state;

  const updateLibrary = (edit: (lib: Library) => Library) =>
    setState((s) => {
      const next = edit(s.library);
      // A deleted root or target falls back to something valid.
      return next === s.library ? s : { library: next, view: normalizeView(s.view, next) };
    });
  const updateView = (patch: Partial<ViewState>) => setState((s) => ({ ...s, view: { ...s.view, ...patch } }));
  const startFrom = (rootId: string) => updateView({ rootId, positionSec: 0 });

  const graph = useMemo(() => new TransitionGraph(library.songs, library.transitions), [library]);
  const root = graph.songs.get(state.view.rootId);
  const rootLengthSec = root?.lengthSec ?? DEFAULT_LENGTH_SEC;
  // The playing position can't run past the end of the current track.
  const view = useMemo(
    () => ({ ...state.view, positionSec: Math.min(state.view.positionSec, rootLengthSec) }),
    [state.view, rootLengthSec],
  );
  const scene = useMemo(() => buildScene(graph, view), [graph, view]);
  const sortedSongs = useMemo(
    () => [...library.songs].sort((a, b) => a.title.localeCompare(b.title)),
    [library.songs],
  );

  return (
    <>
      <header className="flex flex-wrap items-baseline gap-3.5 px-3 pt-4 pb-2 lg:px-5.5 lg:pt-4.5">
        <h1 className="font-display text-[28px] font-bold tracking-tight">Branchline</h1>
        <p className="text-muted">Save transitions you trust. Explore every set they make.</p>
      </header>

      <div className="grid grid-cols-1 gap-4 px-3 pt-2 pb-4 lg:grid-cols-[340px_minmax(0,1fr)] lg:px-5.5 lg:pb-5.5">
        <Sidebar
          library={library}
          songs={sortedSongs}
          transitions={library.transitions}
          onAddSong={(song) => updateLibrary((lib) => addSong(lib, song))}
          onRemoveSong={(id) => updateLibrary((lib) => removeSong(lib, id))}
          onStartFrom={startFrom}
          onSaveTransition={(t) => updateLibrary((lib) => saveTransition(lib, t))}
          onRemoveTransition={(id) => updateLibrary((lib) => removeTransition(lib, id))}
          onImportPaste={(text) => {
            const result = importPastedSet(library, text);
            updateLibrary(() => result.library);
            return importMessage(result.newTransitions, result.newSongs);
          }}
          onImportRekordbox={(parsed, playlistIndexes) => {
            const result = applyRekordboxImport(library, parsed, playlistIndexes);
            updateLibrary(() => result.library);
            return importMessage(result.newTransitions, result.newSongs);
          }}
          onResetDemo={() => {
            if (!window.confirm("Replace all your songs and transitions with the demo data?")) return false;
            setState(demoState());
            return true;
          }}
        />

        <main className="flex min-w-0 flex-col gap-3">
          {root && (
            <Controls
              songs={sortedSongs}
              view={view}
              rootLengthSec={rootLengthSec}
              onChange={updateView}
            />
          )}
          <TreeCanvas scene={scene} songs={graph.songs} onPick={startFrom} />
          <UnderTheHood
            scene={scene}
            view={view}
            songCount={library.songs.length}
            transitionCount={library.transitions.length}
            rootTitle={root?.title ?? ""}
            targetTitle={graph.songs.get(view.targetId)?.title ?? ""}
          />
        </main>
      </div>
    </>
  );
}
