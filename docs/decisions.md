# Architecture decisions

Each entry: the choice, the options considered, and why.

## 1. Platform: installable web app (PWA)

- Options: PWA, native Android (Kotlin), desktop (Electron/Tauri).
- Chosen: PWA. One codebase works on a laptop next to Rekordbox and on a phone, with nothing to install from a store.
- Revisit if: direct access to the Rekordbox library on disk becomes essential (that would favor Tauri).

## 2. Frontend: Next.js + TypeScript

- Options: Next.js, Vite + React.
- Chosen: Next.js App Router, so routing, server actions, and API routes live in one project.

## 3. Backend: Next.js server code + Supabase

- Options: Next.js routes; separate FastAPI or Go API.
- Chosen: Next.js routes talking to Supabase. Fastest path to a deployed app. A separate API can be split out later if the project needs to show it.

## 4. Database: Postgres, not a graph database

- Options: Postgres (Supabase/Neon), Neo4j.
- Chosen: Postgres with `songs` and `transitions` tables.
- Why: a single user's graph is small enough to load whole into the client, where traversal is instant. A graph database would add operational cost without a real benefit.

## 5. Graph traversal runs on the client

- `distancesTo` is one BFS on the reversed graph, O(V + E), and gives every song's distance to a target at once, which is exactly what the pathfinder badges need.
- `buildTree` is a depth-limited DFS that keeps a set of songs on the current path. A repeat on the path becomes a "loop" leaf; a repeat in another branch is allowed. A node cap guards against huge fan-out.

## 6. Auth: Supabase Auth

- Matches the database host; row-level security keys every table on `auth.uid()`.

## 7. Rekordbox import in the browser

- Rekordbox's XML export includes BPM, key (`Tonality`, in Camelot or classic notation depending on settings), rating (0–255 in steps of 51), and playlists nested in folders. Playlist entries reference tracks by `TrackID` (`KeyType="0"`) or by `Location` (`KeyType="1"`).
- Parsing client-side means the user's library file is never uploaded.
- Only tracks from the playlists the DJ picks are added, not the whole collection, so a library of thousands of tracks doesn't bury the songs list.
- A track already in the library (same title, and same artist when both have one, case-insensitive) is reused. Rekordbox only fills fields the library left empty, so manual edits win, and re-importing a playlist adds nothing.
- Parsing runs on the main thread. If very large collections freeze the UI, move it to a Web Worker.

## 8. Offline support deferred to v2

- v1 is online-only. v2 goal: IndexedDB as the source of truth on device, background sync to Postgres, conflict rule last-write-wins per row.

## 9. Testing and CI

- Vitest for pure modules, Playwright for a few critical flows (add transition → see it in tree; import XML).
- GitHub Actions runs `npm run check` on every push.
