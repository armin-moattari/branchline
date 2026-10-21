# Branchline

A DJ set planner built around a **directed graph of transitions**. A song is a node; "I know A mixes into B" is an edge A → B. The UI unrolls that graph into trees: what can I play next, what leads into this song, and how do I get to a requested track. Inspired by studying mixtree.studio; this is an original implementation for learning and as a portfolio project.

**Product rule: no AI, no suggestions.** The app never recommends tracks or transitions. Every path shown is one the DJ saved.

## Status

- Done: pure TypeScript core in `src/graph` and `src/import`, with 47 Vitest tests.
- Done: `prototype/branchline.html`, a single-file working demo of the whole idea (reference for UI behavior, not production code).
- Done: Next.js 16 (App Router) + React 19 + Tailwind v4 scaffold in `src/app`, with a placeholder home page that uses `src/graph`.
- Next: port the prototype UI (Roadmap step 2).

## Commands

```bash
npm install
npm run dev       # Next.js dev server on http://localhost:3000
npm run build     # production build
npm test          # vitest run
npm run typecheck # tsc --noEmit
npm run check     # both; run before every commit
```

## Layout

```
src/app/               Next.js App Router (layout, pages, globals.css with Tailwind theme tokens)
src/graph/types.ts     Song, Transition, TreeNode, Direction
src/graph/graph.ts     TransitionGraph (adjacency both ways), distancesTo (reverse BFS),
                       shortestPath, buildTree (depth-limited DFS with loop stubs + cue "passed")
src/graph/layout.ts    layoutTree: tidy tree layout in grid units (leaf rows, centered parents)
src/import/playlist.ts transitionsFromSet: ordered set → back-to-back transitions, deduped
src/import/camelot.ts  toCamelot: "Am" / "F#m" / "8A" → Camelot
src/import/rekordbox.ts parseRekordboxXml: collection + playlists (folders, KeyType 0/1)
test/                  one test file per module; fixtures/ has a sample Rekordbox XML
prototype/             original single-file HTML demo
docs/decisions.md      architecture choices and why
```

## Architecture decisions (summary; details in docs/decisions.md)

- **Stack ("Lean")**: Next.js (App Router) + TypeScript, Supabase (Postgres + Auth), deployed on Vercel. Vitest for unit tests, Playwright for a few end-to-end tests, GitHub Actions CI.
- **Graph runs on the client.** One DJ's graph is small (thousands of edges at most), so load all songs and transitions once and traverse in the browser. No graph database. The server is CRUD + auth.
- **`src/graph` and `src/import` stay framework-free.** No React, Next, or DB imports in them. The app imports them via the `@/graph` and `@/import` path aliases; keep them pure and tested.
- **Styling**: Tailwind v4. Colors are CSS variables in `src/app/globals.css` (ported from the prototype) exposed as Tailwind colors (`bg-panel`, `text-muted`, `text-accent`, ...).
- **Rekordbox import parses in the browser.** The XML never leaves the user's machine; only the resulting songs/transitions are saved.
- **Offline / local-first is v2**, not v1.
- **Tree rendering**: start with custom SVG (as in the prototype); consider React Flow later if pan/zoom/drag becomes worth the dependency.

## Data model (planned Postgres tables)

- `songs(id, user_id, title, artist, bpm, camelot_key, length_sec, rating, source, source_ref, created_at)`
- `transitions(id, user_id, from_song_id, to_song_id, cue_sec, note, created_at)`, unique on `(user_id, from_song_id, to_song_id)`
- `playlists(id, user_id, name, path text[])` and `playlist_tracks(playlist_id, position, song_id)`
- Row-level security: every table filtered by `user_id = auth.uid()`.

## Roadmap

1. ~~Scaffold Next.js app in this repo (keep `src/graph`, `src/import`, tests passing).~~ Done.
2. Port the prototype UI: songs list, add transition, tree view with look ahead / look toward, depth, pathfinder target, playing-position slider.
3. Rekordbox XML import screen (pick file → preview playlists → import as transitions).
4. Supabase schema + auth + RLS; persist songs and transitions.
5. CI (typecheck + tests on push), deploy to Vercel.
6. v2: local-first offline sync, Serato import, highlights, isolate-path-to-playlist.

## How to work in this repo

- Write or update tests with every change to `src/graph` or `src/import`. Prefer test-first for logic.
- Keep modules small and single-purpose; refactor when a file grows past one clear job.
- Run `npm run check` before committing. Small commits with clear messages (imperative mood, e.g. "Add shortest-path helper").
- Use fictional track names in fixtures and demo data.
